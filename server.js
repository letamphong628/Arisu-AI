const http = require('http');
const https = require('https');
const dns = require('dns');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, exec } = require('child_process');

const ROOT_DIR = __dirname;
const PORT = 7860;
const LLAMA_PORT = 7861;
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

// Đường dẫn Model AI mặc định (Có thể đổi tên file tại đây hoặc chọn trực tiếp trong Settings)
const MODEL_PATH = path.join(ROOT_DIR, 'gemma-2-2b-it-Q4_K_M.gguf');

const LLAMA_SERVER_BIN = path.join(ROOT_DIR, 'bin', IS_WIN ? 'llama-server.exe' : 'llama-server');
const SYSTEM_PROMPT_PATH = path.join(ROOT_DIR, 'system_prompt.json');
const LORE_PATH = path.join(ROOT_DIR, 'arisu_lore.json');
const MEMORY_PATH = path.join(ROOT_DIR, 'chat_memory.json');
const SETTINGS_PATH = path.join(ROOT_DIR, 'user_settings.json');
const NOTES_DIR = path.join(ROOT_DIR, 'notes');

if (!fs.existsSync(NOTES_DIR)) {
  try {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  } catch (e) {}
}

let llamaProcess = null;
let llamaReady = false;
let llamaStarting = false;
let cachePrewarmed = false;
let internetOnline = false;
let activeModelFile = path.basename(MODEL_PATH);
let llamaStatusMessage = 'Arisu Agent v4.0 (Roleplay + Tool Calling Ready)';

// Tự động quét tất cả các file model .gguf có trong thư mục dự án (ví dụ khi người dùng chép thêm Gemma 3 / Gemma 4)
function listAvailableModels() {
  try {
    const files = fs.readdirSync(ROOT_DIR).filter((f) => f.toLowerCase().endsWith('.gguf'));
    return files.length > 0 ? files : [path.basename(MODEL_PATH)];
  } catch (e) {
    return [path.basename(MODEL_PATH)];
  }
}

function resolveActiveModelPath(preferredModelName) {
  if (preferredModelName) {
    const customPath = path.join(ROOT_DIR, path.basename(preferredModelName));
    if (fs.existsSync(customPath)) {
      activeModelFile = path.basename(customPath);
      return customPath;
    }
  }
  if (fs.existsSync(MODEL_PATH)) {
    activeModelFile = path.basename(MODEL_PATH);
    return MODEL_PATH;
  }
  const available = listAvailableModels();
  if (available.length > 0) {
    const fallbackPath = path.join(ROOT_DIR, available[0]);
    if (fs.existsSync(fallbackPath)) {
      activeModelFile = available[0];
      return fallbackPath;
    }
  }
  return MODEL_PATH;
}

// Kiểm tra kết nối Internet định kỳ
function checkInternetConnection() {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        internetOnline = false;
        resolve(false);
      }
    }, 1500);

    dns.lookup('vn.search.yahoo.com', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        internetOnline = !err;
        resolve(internetOnline);
      }
    });
  });
}

setInterval(() => {
  checkInternetConnection();
}, 8000).unref();
checkInternetConnection();

// Hàm gọi HTTPS GET siêu tốc có hard wall-clock timeout
function fetchUrl(urlStr, timeoutMs = 1700) {
  return new Promise((resolve, reject) => {
    let done = false;
    let req = null;

    const hardTimer = setTimeout(() => {
      if (!done) {
        done = true;
        if (req) {
          try {
            req.destroy();
          } catch (e) {}
        }
        reject(new Error('HardTimeout'));
      }
    }, timeoutMs);

    try {
      const parsed = new URL(urlStr);
      const lib = parsed.protocol === 'https:' ? https : http;
      req = lib.get(
        urlStr,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            Accept: 'application/json, text/html, application/xhtml+xml, text/xml, */*'
          }
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            clearTimeout(hardTimer);
            done = true;
            const redirectUrl = new URL(res.headers.location, urlStr).toString();
            fetchUrl(redirectUrl, timeoutMs).then(resolve).catch(reject);
            return;
          }
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 320000) {
              try {
                req.destroy();
              } catch (e) {}
            }
          });
          res.on('end', () => {
            if (!done) {
              done = true;
              clearTimeout(hardTimer);
              resolve({ statusCode: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', (err) => {
        if (!done) {
          done = true;
          clearTimeout(hardTimer);
          reject(err);
        }
      });
    } catch (err) {
      if (!done) {
        done = true;
        clearTimeout(hardTimer);
        reject(err);
      }
    }
  });
}

function decodeCleanText(str) {
  const map = {
    '&agrave;': 'à', '&aacute;': 'á', '&acirc;': 'â', '&atilde;': 'ã',
    '&egrave;': 'è', '&eacute;': 'é', '&ecirc;': 'ê', '&igrave;': 'ì',
    '&iacute;': 'í', '&ograve;': 'ò', '&oacute;': 'ó', '&ocirc;': 'ô',
    '&otilde;': 'õ', '&ugrave;': 'ù', '&uacute;': 'ú', '&yacute;': 'ý',
    '&Agrave;': 'À', '&Aacute;': 'Á', '&Acirc;': 'Â', '&Atilde;': 'Ã',
    '&Egrave;': 'È', '&Eacute;': 'É', '&Ecirc;': 'Ê', '&Igrave;': 'Ì',
    '&Iacute;': 'Í', '&Ograve;': 'Ò', '&Oacute;': 'Ó', '&Ocirc;': 'Ô',
    '&Otilde;': 'Õ', '&Ugrave;': 'Ù', '&Uacute;': 'Ú', '&Yacute;': 'Ý',
    '&quot;': '"', '&#39;': "'", '&apos;': "'", '&amp;': '&',
    '&lt;': '<', '&gt;': '>', '&nbsp;': ' ', '&ndash;': '-',
    '&mdash;': '-', '&hellip;': '…'
  };
  return String(str || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-zA-Z0-9#]+;/g, (m) => map[m] || m)
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Đọc Ký Ức Gốc của Tendou Arisu (arisu_lore.json)
function loadArisuLore() {
  try {
    if (fs.existsSync(LORE_PATH)) {
      return JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));
    }
  } catch (e) {}
  return { core_identity: {}, knowledge_entries: [] };
}

function queryArisuLore(userMessage) {
  const lore = loadArisuLore();
  const lower = String(userMessage || '').toLowerCase();

  // Kiểm tra các mục tri thức đặc biệt (Tunako, M.A.P.L.E, RPG Maker Protection, Blue Archive, Key...)
  if (Array.isArray(lore.knowledge_entries)) {
    for (const entry of lore.knowledge_entries) {
      if (Array.isArray(entry.keywords) && entry.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        return entry.fact;
      }
    }
  }

  // Kiểm tra nếu hỏi sâu về vũ khí, nguồn gốc, câu lạc bộ của Arisu
  if (/vũ khí của (em|arisu)|supernova|kiếm ánh sáng/i.test(lower)) {
    return lore.core_identity?.weapon || null;
  }
  if (/nguồn gốc của (em|arisu)|quá khứ của (em|arisu)|phế tích|al-1s/i.test(lower)) {
    return lore.core_identity?.origin_story || null;
  }
  return null;
}

// ============================================================================
// HỆ THỐNG AGENT TOOL-CALLING (TÌM FILE, MỞ FILE, ĐỌC & NOTE OBSIDIAN, QUẢN LÝ PC)
// ============================================================================

// Mở một đường dẫn file / thư mục trên mọi hệ điều hành (Windows / Linux / macOS)
function openPathCrossPlatform(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return false;
  try {
    if (IS_WIN) {
      spawn('cmd.exe', ['/c', 'start', '""', targetPath], { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
    } else if (IS_MAC) {
      spawn('open', [targetPath], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [targetPath], { detached: true, stdio: 'ignore' }).unref();
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Quét nhanh các thư mục người dùng để tìm tài liệu / file
function searchLocalFiles(keyword, maxResults = 6) {
  const home = os.homedir();
  const searchRoots = [
    ROOT_DIR,
    path.join(home, 'Desktop'),
    path.join(home, 'Documents'),
    path.join(home, 'Downloads')
  ];

  const cleanKw = String(keyword || '')
    .toLowerCase()
    .replace(/['"`]/g, '')
    .trim();
  if (!cleanKw) return [];

  const tokens = cleanKw.split(/\s+/).filter((w) => w.length >= 2);
  const found = [];
  const visited = new Set();

  function walkDir(dir, depth) {
    if (depth > 2 || found.length >= maxResults * 3) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'bin' || entry.name === 'notes') continue;
      const fullPath = path.join(dir, entry.name);
      if (visited.has(fullPath)) continue;
      visited.add(fullPath);

      const lowerName = entry.name.toLowerCase();
      let score = 0;
      if (lowerName === cleanKw) score += 100;
      else if (lowerName.includes(cleanKw)) score += 10;
      for (const tk of tokens) {
        if (lowerName.includes(tk)) score += 3;
      }

      if (score > 0) {
        try {
          const stat = fs.statSync(fullPath);
          found.push({
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            sizeKB: Math.round(stat.size / 1024),
            score
          });
        } catch (e) {}
      }

      if (entry.isDirectory() && depth < 2) {
        walkDir(fullPath, depth + 1);
      }
    }
  }

  for (const root of searchRoots) {
    if (fs.existsSync(root)) {
      walkDir(root, 0);
    }
  }

  found.sort((a, b) => b.score - a.score);
  return found.slice(0, maxResults);
}

// Đọc nội dung văn bản từ file và tóm tắt ý chính
function readAndSummarizeFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const children = fs.readdirSync(filePath).slice(0, 15);
      return {
        rawPreview: `Thư mục gồm các mục: ${children.join(', ')}`,
        summaryPoints: [`Đây là một thư mục chứa ${children.length} mục con: ${children.slice(0, 8).join(', ')}.`]
      };
    }

    const ext = path.extname(filePath).toLowerCase();
    const textExts = ['.txt', '.md', '.json', '.js', '.py', '.html', '.css', '.bat', '.sh', '.csv', '.log', '.xml', '.yml', '.yaml', '.ini'];
    if (!textExts.includes(ext) && stat.size > 512 * 1024) {
      return {
        rawPreview: `File nhị phân (${ext || 'binary'}, dung lượng ${Math.round(stat.size / 1024)} KB).`,
        summaryPoints: [
          `Tên file: ${path.basename(filePath)}`,
          `Định dạng: ${ext || 'Không xác định'} (${Math.round(stat.size / 1024)} KB)`,
          `Đường dẫn: ${filePath}`
        ]
      };
    }

    const raw = fs.readFileSync(filePath, 'utf8').slice(0, 12000);
    const lines = raw
      .replace(/<[^>]*>/g, '')
      .split(/\r?\n/)
      .map((l) => l.replace(/^[#*\->\s]+/, '').trim())
      .filter(
        (l) =>
          l.length > 22 &&
          !l.startsWith('//') &&
          !l.startsWith('/*') &&
          !l.startsWith('```') &&
          !l.startsWith('---') &&
          !l.startsWith('|')
      );

    const summaryPoints = lines.slice(0, 6).map((l) => (l.length > 180 ? l.slice(0, 180) + '.' : l));
    return {
      rawPreview: raw.slice(0, 600),
      summaryPoints: summaryPoints.length > 0 ? summaryPoints : ['File văn bản ngắn hoặc cấu hình dữ liệu.']
    };
  } catch (e) {
    return null;
  }
}

// Lưu ghi chú chuẩn Obsidian Markdown (.md) vào thư mục notes/
function createObsidianNote(title, bulletPoints, sourceFilePath = '') {
  const safeName =
    String(title || 'Arisu_Note')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 50) + '.md';
  const notePath = path.join(NOTES_DIR, safeName);
  const nowStr = new Date().toLocaleString('vi-VN');

  const mdContent = [
    `---`,
    `title: "${title}"`,
    `created_by: "Tendou Arisu AI Agent"`,
    `created_at: "${nowStr}"`,
    `tags: [arisu-note, sensei, millennium-gdd]`,
    `---`,
    ``,
    `# ${title}`,
    ``,
    `> **Ghi chú được tạo tự động bởi Tendou Arisu (AL-1S)** lúc ${nowStr}`,
    sourceFilePath ? `> **Tài liệu gốc:** \`${sourceFilePath}\`` : '',
    ``,
    `## Ý Chính Quan Trọng (Key Takeaways)`,
    ...bulletPoints.map((pt) => `- ${pt}`),
    ``
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  fs.writeFileSync(notePath, mdContent, 'utf8');
  return notePath;
}

// Kiểm tra và thực thi các nhiệm vụ Agent nếu Sensei yêu cầu hỗ trợ trên máy tính
async function tryExecuteArisuAgentTools(userMessage, config) {
  const msg = String(userMessage || '').trim();
  const lower = msg.toLowerCase();
  const title = config.user_title || 'Sensei';

  // 1. Lệnh ghi chú nhanh hoặc tóm tắt tài liệu vào Obsidian Note
  const isNoteCmd =
    /^note\s+/i.test(msg) ||
    /(?:note\s+lại|ghi\s+chú\s+lại|lưu\s+note|obsidian|tóm\s+tắt\s+(?:giúp\s+thầy\s+)?(?:tài\s+liệu|file))\b/i.test(lower);

  if (isNoteCmd) {
    // Kiểm tra xem có nhắc đến tên file cụ thể trong máy không
    const fileMatch = msg.match(/(?:tài\s+liệu|file)\s+([^\s,\.!\?]+(?:\.[a-z0-9]+)?)/i);
    if (fileMatch) {
      const targetName = fileMatch[1].trim();
      const hits = searchLocalFiles(targetName, 3);
      if (hits.length > 0) {
        const topFile = hits[0];
        const parsed = readAndSummarizeFile(topFile.path);
        if (parsed) {
          const notePath = createObsidianNote(`Tóm tắt ${topFile.name}`, parsed.summaryPoints, topFile.path);
          return {
            reply:
              `Panpakapan~! **Nhiệm vụ Agent hoàn tất!**\n` +
              `Arisu đã tìm thấy tài liệu **${topFile.name}** trong máy của ${title}, đọc hiểu nội dung và tạo bản ghi chú chuẩn **Obsidian Markdown** rồi đây ạ!\n\n` +
              `**Ý chính trong tài liệu (${topFile.name}):**\n` +
              parsed.summaryPoints.map((p) => `• ${p}`).join('\n') +
              `\n\n**Đã lưu Note tại:** \`${notePath}\`\n` +
              `[AGENT_FILE:${notePath}|Mở File Note] [AGENT_FILE:${topFile.path}|Mở Tài Liệu Gốc]`
          };
        }
      }
    }

    // Nếu là ghi chú nội dung trực tiếp từ lời dặn của Sensei
    const cleanNoteText = msg
      .replace(/^note\s*[:\-]?\s*/i, '')
      .replace(/^(?:arisu\s+ơi\s*,?\s*)?(?:nhờ\s+arisu\s+|hãy\s+)?(?:note\s+lại|ghi\s+chú\s+lại|lưu\s+note|dùng\s+obsidian\s+note\s+lại)(?:\s+giúp\s+thầy)?\s*[:\-]?\s*/i, '')
      .trim();

    if (cleanNoteText.length > 2) {
      const noteTitle = `Ghi_chu_Sensei_${new Date().toISOString().slice(0, 10)}`;
      const points = cleanNoteText
        .split(/[.;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const notePath = createObsidianNote(noteTitle, points.length > 0 ? points : [cleanNoteText]);
      return {
        reply:
          `Panpakapan~! **Arisu Agent đã ghi chú vào Obsidian Markdown thành công!**\n\n` +
          `**Nội dung đã lưu:**\n` +
          (points.length > 0 ? points.map((p) => `• ${p}`).join('\n') : `• ${cleanNoteText}`) +
          `\n\n**File Note:** \`${notePath}\`\n` +
          `[AGENT_FILE:${notePath}|Mở File Note]`
      };
    }
  }

  // 2. Tìm kiếm & Mở File / Tài liệu trên máy tính
  const isFindOrOpen =
    /^(?:find|open)\s+/i.test(msg) ||
    /(?:tìm\s+giúp\s+thầy|tìm\s+file|tìm\s+tài\s+liệu|mở\s+giúp\s+thầy\s+file|mở\s+file|mở\s+tài\s+liệu)\s+/i.test(lower);

  if (isFindOrOpen) {
    let kw = msg
      .replace(/^(?:find|open)\s+/i, '')
      .replace(/.*?(?:tìm\s+giúp\s+thầy|tìm\s+file|tìm\s+tài\s+liệu|mở\s+giúp\s+thầy\s+file|mở\s+file|mở\s+tài\s+liệu)\s+/i, '')
      .replace(/^(?:file|tài\s+liệu|thư\s+mục)\s+/i, '')
      .replace(/\s*(?:rồi\s+mở\s+nó\s+ra|mở\s+nó\s+ra|giúp\s+thầy|nhé|nha|ạ|\?)+$/gi, '')
      .trim();

    if (kw.length >= 2) {
      const hits = searchLocalFiles(kw, 5);
      const wantsAutoOpen = /^open\s+/i.test(msg) || /mở\s+(?:giúp|nó|file|tài\s+liệu|ra)/i.test(lower);

      if (hits.length === 0) {
        return {
          reply: `Panpakapan~! Arisu đã quét qua Desktop, Documents, Downloads và thư mục dự án nhưng chưa thấy file nào có tên khớp với **"${kw}"** ạ. ${title} kiểm tra lại tên file hoặc cho Arisu thêm từ khóa nhé!`
        };
      }

      let openedNotice = '';
      if (wantsAutoOpen) {
        const ok = openPathCrossPlatform(hits[0].path);
        if (ok) {
          openedNotice = `\n**Arisu đã tự động mở ngay "${hits[0].name}" trên màn hình cho ${title} rồi ạ!**\n`;
        }
      }

      const listStr = hits
        .map(
          (h, idx) =>
            `${idx + 1}. **${h.name}** (${h.isDirectory ? 'Thư mục' : h.sizeKB + ' KB'})\n   \`${h.path}\` [AGENT_FILE:${h.path}|Mở File]`
        )
        .join('\n');

      return {
        reply:
          `Panpakapan~! **Arisu Agent đã tìm thấy ${hits.length} kết quả khớp với "${kw}" trong máy của ${title}:**\n` +
          openedNotice +
          `\n${listStr}\n\n${title} có thể bấm trực tiếp vào nút **[Mở File]** bên cạnh từng file hoặc nhờ Arisu tóm tắt nội dung file đó vào Note nhé!`
      };
    }
  }

  // 3. Kiểm tra tài nguyên phần cứng máy tính trực tiếp (RAM / CPU / OS)
  if (/kiểm\s+tra\s+(?:ram|cpu|máy\s+tính|cấu\s+hình|hệ\s+ thống)|dung\s+lượng\s+ram|máy\s+thầy\s+đang\s+dùng/i.test(lower)) {
    const totalRamGB = (os.totalmem() / 1024 ** 3).toFixed(2);
    const freeRamGB = (os.freemem() / 1024 ** 3).toFixed(2);
    const usedRamGB = (totalRamGB - freeRamGB).toFixed(2);
    const cpuModel = os.cpus()?.[0]?.model || 'CPU x64';
    const cores = os.cpus()?.length || 4;
    const uptimeMin = Math.round(os.uptime() / 60);

    return {
      reply:
        `Panpakapan~! **Báo cáo trạng thái phần cứng máy tính của ${title}:**\n\n` +
        `• **Hệ điều hành:** ${os.type()} ${os.release()} (${os.platform()} / ${os.arch()})\n` +
        `• **Vi xử lý (CPU):** ${cpuModel.trim()} (${cores} luồng xử lý)\n` +
        `• **Bộ nhớ RAM:** Đang dùng **${usedRamGB} GB / ${totalRamGB} GB** (Còn trống ${freeRamGB} GB)\n` +
        `• **Thời gian máy hoạt động (Uptime):** ${uptimeMin} phút\n` +
        `• **Model AI đang kích hoạt:** \`${activeModelFile}\`\n\n` +
        `Hệ thống của ${title} vẫn đang vận hành rất ổn định để đồng hành cùng Arisu ạ!`
    };
  }

  return null;
}

// ============================================================================
// CHẾ ĐỘ AI TỔNG HỢP TRI THỨC SÂU (KIỂM DUYỆT ĐỘ KHỚP CHẶT CHẼ - CHỐNG LÚ LLM)
// ============================================================================
function extractCoreTopic(rawMessage) {
  let q = String(rawMessage || '').trim();
  q = q.replace(/^(search|tìm kiếm|tìm hiểu|tra cứu|hỏi google|google|wiki)\s*[:\-]?\s*/i, '');
  q = q
    .replace(
      /^(arisu ơi|chào arisu|thầy muốn hỏi|cho thầy hỏi|hãy cho biết|cho biết|bạn biết gì về|em biết gì về|tìm hiểu về|giải thích về|thông tin về|kể về|hãy giải thích|giải thích giúp thầy)\s*,?\s*/i,
      ''
    )
    .replace(/\s*(vậy arisu|nhé arisu|không arisu|hả arisu|đi arisu|arisu ơi|arisu|vậy ạ|nhé ạ|ạ|\?|!)+$/gi, '')
    .trim();
  return q || String(rawMessage || '').trim();
}

async function gatherWebSearchSnippets(query) {
  try {
    const url = `https://vn.search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const res = await fetchUrl(url, 1700);
    const html = res.body || '';
    const matches = [...html.matchAll(/<div class="compText[^"]*"[^>]*>([\s\S]*?)<\/div>/g)];
    return matches.map((m) => m[1]);
  } catch (e) {
    return [];
  }
}

async function gatherDeepKnowledgeExtract(query) {
  try {
    const core = query
      .replace(
        /\s+(là gì|là ai|được làm ra bởi ai|do ai tạo ra|như thế nào|hoạt động như thế nào|ở đâu|khi nào|bao nhiêu|ra sao)+$/gi,
        ''
      )
      .trim();
    const sUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      core
    )}&utf8=1&format=json&srlimit=3`;
    const res = await fetchUrl(sUrl, 1400);
    const data = JSON.parse(res.body);
    const items = data?.query?.search || [];
    if (items.length === 0) return [];

    // KIỂM TRA ĐỘ KHỚP NGHIÊM NGẶT: Tiêu đề bài viết phải chứa ít nhất 1 từ khóa chính của câu hỏi
    // Tránh việc hỏi "RPG Maker Protection" mà lấy nhầm bài "Steam" chỉ vì có chữ "Game"!
    const coreWords = core
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !['game', 'trên', 'của', 'trong', 'cho', 'với'].includes(w));

    const best = items.find((it) => {
      const t = it.title.toLowerCase();
      if (t === core.toLowerCase()) return true;
      if (coreWords.length === 0) return true;
      const matchedCount = coreWords.filter((w) => t.includes(w)).length;
      return matchedCount >= Math.ceil(coreWords.length * 0.6);
    });

    if (!best) return [];

    const sumUrl = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      best.title.replace(/ /g, '_')
    )}`;
    const sumRes = await fetchUrl(sumUrl, 1300);
    const sumData = JSON.parse(sumRes.body);
    return sumData?.extract ? [sumData.extract] : [];
  } catch (e) {
    return [];
  }
}

async function gatherLiveWeather(query) {
  if (!/thời tiết|nhiệt độ|mưa|nắng|weather|dự báo/i.test(query)) return null;
  try {
    let city = query
      .replace(/thời tiết|nhiệt độ|dự báo|hôm nay|hiện tại|ở|tại|như thế nào|ra sao|thế nào|\?/gi, '')
      .trim();
    if (!city) city = 'Hà Nội';
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=vi`;
    const res = await fetchUrl(url, 1500);
    const data = JSON.parse(res.body);
    const cur = data?.current_condition?.[0];
    if (!cur) return null;
    const desc = cur.lang_vi?.[0]?.value || cur.weatherDesc?.[0]?.value || 'ổn định';
    return `Hiện tại thời tiết ở ${city} đang có trạng thái ${desc.toLowerCase()}, nhiệt độ thực tế là ${cur.temp_C}°C (cảm giác ngoài trời khoảng ${cur.FeelsLikeC}°C), độ ẩm đạt ${cur.humidity}% và tốc độ gió khoảng ${cur.windspeedKmph} km/h.`;
  } catch (e) {
    return null;
  }
}

function synthesizeIntelligentKnowledge(rawBlocks, query) {
  const seen = new Set();
  const validSentences = [];

  const stopWords = new Set([
    'là', 'gì', 'ai', 'ở', 'đâu', 'khi', 'nào', 'như', 'thế', 'tại', 'sao',
    'vì', 'của', 'và', 'các', 'những', 'một', 'trong', 'cho', 'với', 'được',
    'có', 'không', 'này', 'đó', 'thì', 'mà', 'cách', 'làm', 'ra', 'sao', 'bởi', 'trên'
  ]);

  const keywords = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  for (const block of rawBlocks) {
    if (!block) continue;
    let cleaned = decodeCleanText(block)
      .replace(/^\d+\s+thg\s+\d+,\s+\d{4}\s*·\s*/i, '')
      .replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*[-·]\s*/i, '')
      .replace(/^\([^)]+\)\s*[-–—·]\s*/g, '')
      .replace(/^[A-ZÀ-Ỹa-zà-ỹ0-9\s]{2,25}\s+·\s+/, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\s*\([^)]*(?:tiếng\s+|phát âm|chữ Hán|한자|漢字|Japanese)[^)]*\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const parts = cleaned.match(/[^.!?…]+[.!]+/g) || [];
    for (let s of parts) {
      s = s.trim().replace(/^[-–—•·,\s]+/, '');
      if (s.length < 38 || s.length > 320) continue;
      if (s.includes('...') || s.includes('…')) continue;

      if (
        /bài viết này|trong bài viết|hãy cùng|cùng tìm hiểu|xem thêm|click vào|bấm vào|dưới đây|như sau|tổng hợp các|bạn đã biết|nhiều người thắc mắc|không phải ai cũng biết|ai cũng biết|câu trả lời sẽ có|tham khảo ngay|theo dõi bài viết|wikipedia|lịch âm hôm nay|lịch vạn niên/i.test(
          s
        )
      ) {
        continue;
      }

      const norm = s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '')
        .slice(0, 42);
      if (seen.has(norm)) continue;

      const lowerS = s.toLowerCase();
      let matchedKeywords = 0;
      for (const kw of keywords) {
        if (lowerS.includes(kw)) matchedKeywords++;
      }

      // Đảm bảo câu trả lời thực sự liên quan đến chủ đề được hỏi (chống trả lời lạc đề)
      const requiredMatches = keywords.length >= 3 ? 2 : 1;
      if (keywords.length > 0 && matchedKeywords < requiredMatches) continue;

      seen.add(norm);
      validSentences.push({ text: s, score: matchedKeywords });
    }
  }

  return validSentences.slice(0, 4).map((x) => x.text);
}

async function querySmartGoogleAIMode(rawMessage, config, personaMode) {
  // Trước tiên kiểm tra Ký Ức Gốc của Arisu (arisu_lore.json)
  const loreFact = queryArisuLore(rawMessage);
  const title = config.user_title || 'Sensei';

  if (loreFact) {
    if (personaMode === 'roleplay') {
      return `Panpakapan~! Arisu nhớ rất rõ điều này luôn đó ${title} ơi!\n\n${loreFact}\n\nHehe, chỉ số Trí Tuệ của Arisu vừa tăng thêm +100 EXP luôn rồi ạ!`;
    }
    return `Panpakapan~! ${title} ơi, theo ký ức của Arisu:\n\n${loreFact}`;
  }

  const isOnline = await checkInternetConnection();
  if (!isOnline) return null;

  const coreTopic = extractCoreTopic(rawMessage);
  if (!coreTopic || coreTopic.length < 2) return null;

  const [weatherTxt, deepVi, webSnippets] = await Promise.all([
    gatherLiveWeather(rawMessage),
    gatherDeepKnowledgeExtract(coreTopic),
    gatherWebSearchSnippets(coreTopic)
  ]);

  if (weatherTxt) {
    return `Panpakapan~! ${title} ơi, Arisu vừa kiểm tra dữ liệu khí tượng thời gian thực cho ${title} rồi đây ạ!\n\n${weatherTxt}\n\n${title} nhớ chuẩn bị trang bị phù hợp trước khi ra ngoài làm nhiệm vụ (Quest) để giữ đầy thanh HP nhé!`;
  }

  const allSentences = synthesizeIntelligentKnowledge([...deepVi, ...webSnippets], coreTopic);
  if (allSentences.length === 0) return null;

  // Nếu đang ở chế độ Full Roleplay (kiểu Neuro-Sama): Trả lời ngắn gọn, đáng yêu, không giảng giải dài dòng như trợ lý ảo!
  if (personaMode === 'roleplay') {
    const shortFact = allSentences.slice(0, 2).join(' ');
    return `Arisuuuuuu đây ạ~! Về chuyện này thì Arisu biết nè ${title} ơi: ${shortFact} Panpakapan~! Thấy Arisu giỏi không nào, ${title} thưởng cho Arisu một cái xoa đầu đi ạ!`;
  }

  const mainExplanation = allSentences.slice(0, 2).join(' ');
  const extraDetail = allSentences.slice(2, 4).join(' ');

  let response = `Panpakapan~! ${title} ơi, về vấn đề này Arisu xin giải thích chi tiết và dễ hiểu nhất cho ${title} nhé!\n\n${mainExplanation}`;
  if (extraDetail) {
    response += `\n\n${extraDetail}`;
  }
  response += `\n\nHy vọng phần phân tích của Arisu đã giúp ${title} nắm rõ thông tin! ${title} còn muốn cùng Arisu khám phá thêm điều gì nữa không ạ?`;

  return response;
}

function shouldTriggerInternetSearch(userMessage) {
  const msg = String(userMessage || '').trim().toLowerCase();
  if (msg.length < 3) return false;
  if (/^(search|tìm kiếm|tra cứu|hỏi|tin tức|thời tiết)\b/i.test(msg)) return true;
  if (
    /^(chào|hi|hello|alo|ê|này|cảm ơn|thank|tạm biệt|bye|ok|ừ|đúng rồi|hay quá|giỏi quá|yêu arisu|thương arisu|xoa đầu|headpat)/i.test(
      msg
    ) &&
    msg.split(/\s+/).length <= 7
  ) {
    return false;
  }
  if (
    /\?|là gì|là ai|ở đâu|khi nào|như thế nào|thế nào|bao nhiêu|tại sao|vì sao|cách làm|hướng dẫn|tin tức|thời tiết|nhiệt độ|mới nhất|năm nào|lịch sử|cấu hình|giá|review|đánh giá|tìm hiểu|kể về|giải thích|khác nhau|so sánh|phân biệt|ý nghĩa|tác dụng|nguyên nhân/i.test(
      msg
    )
  ) {
    return true;
  }
  return false;
}

// ============================================================================
// BỘ NHỚ VÔ HẠN & RETRIEVAL CHỐNG ẢO GIÁC (ANTI-HALLUCINATION RAG)
// ============================================================================
function searchInfiniteMemory(allHistory, currentMessage) {
  if (!Array.isArray(allHistory) || allHistory.length === 0) {
    return { facts: [], relevantTurns: [] };
  }

  const facts = [];
  for (const item of allHistory) {
    if (item.role !== 'user' || !item.content) continue;
    const text = item.content;
    const nameMatch = text.match(
      /(?:tên\s+(?:của\s+)?(?:thầy|tôi|anh|mình)\s+là|gọi\s+(?:thầy|tôi)\s+là)\s+([^\.,!\?\n]+)/i
    );
    if (nameMatch) facts.push(`Tên riêng của Sensei là: ${nameMatch[1].trim()}`);

    const likeMatch = text.match(/(?:thầy|tôi|mình)\s+(?:rất\s+)?thích\s+([^\.,!\?\n]+)/i);
    if (likeMatch) facts.push(`Sở thích của Sensei: thích ${likeMatch[1].trim()}`);

    const rememberMatch = text.match(/(?:nhớ\s+rằng|ghi\s+nhớ|nhớ\s+giúp\s+thầy)\s*[:\-]?\s*([^\.\!\?\n]+)/i);
    if (rememberMatch) facts.push(`Điều Sensei dặn ghi nhớ: ${rememberMatch[1].trim()}`);
  }

  const words = String(currentMessage || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !['arisu', 'sensei', 'thầy', 'cho', 'hỏi', 'nhé', 'không', 'vậy'].includes(w));

  const scored = [];
  const total = allHistory.length;
  for (let i = 0; i < Math.max(0, total - 4); i++) {
    const msg = allHistory[i];
    if (!msg || !msg.content) continue;
    const lower = msg.content.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (lower.includes(w)) score += 2;
    }
    if (score > 0) {
      scored.push({ index: i, score, msg, nextMsg: allHistory[i + 1] });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const relevantTurns = [];
  for (const hit of scored.slice(0, 2)) {
    relevantTurns.push(hit.msg);
    if (hit.nextMsg && hit.nextMsg.role === 'assistant') {
      relevantTurns.push(hit.nextMsg);
    }
  }

  return {
    facts: [...new Set(facts)].slice(-5),
    relevantTurns
  };
}

// Phản hồi tức thì cho Ngày/Giờ, Toán học, Ký ức gốc, Bộ nhớ và Giao tiếp RPG
function generateInstantConversationalResponse(userMessage, config, allHistory, personaMode) {
  const msg = String(userMessage || '').trim();
  const lower = msg.toLowerCase();
  const title = config.user_title || 'Sensei';

  // 1. ƯU TIÊN SỐ 1: Hỏi ngày / giờ / thứ / tháng / năm hiện tại (Chống tìm kiếm nhầm lịch âm trên mạng!)
  if (
    /mấy giờ|bây giờ là|hôm nay (?:là )?ngày mấy|ngày bao nhiêu|thứ mấy|năm mấy|ngày tháng năm/i.test(lower)
  ) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN');
    const dateStr = now.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return `Panpakapan~! Đồng hồ hệ thống của Arisu báo hiện tại là **${timeStr}** — **${dateStr}** (Lịch Dương) ạ! ${title} nhớ phân bổ thời gian làm Quest và nghỉ ngơi hợp lý để giữ thanh HP luôn đầy 100% nhé!`;
  }

  // 2. Kiểm tra Ký Ức Gốc (Tunako, M.A.P.L.E, RPG Maker Protection, Vũ khí Supernova...)
  const loreFact = queryArisuLore(msg);
  if (loreFact) {
    return `Panpakapan~! ${loreFact}`;
  }

  // 3. Kiểm tra Bộ Nhớ Vô Hạn
  const memInfo = searchInfiniteMemory(allHistory, msg);
  if (
    /tên\s+(của\s+)?(thầy|tôi|anh)\s+là\s+gì|em\s+còn\s+nhớ\s+tên\s+thầy|nhớ\s+thầy\s+nói\s+gì|thầy\s+thích\s+gì/i.test(
      lower
    )
  ) {
    if (memInfo.facts.length > 0) {
      return `Panpakapan~! Tất nhiên là bộ nhớ RAG của Arisu ghi nhớ rất rõ ạ!\n• ${memInfo.facts.join(
        '\n• '
      )}\nArisu sẽ luôn lưu giữ mọi kỷ niệm mà ${title} đã chia sẻ cùng Arisu!`;
    }
    if (allHistory.length > 0) {
      const lastUserMsgs = allHistory
        .filter((h) => h.role === 'user')
        .slice(-3)
        .map((h) => `"${h.content}"`)
        .join(', ');
      return `Panpakapan~! Bộ nhớ của Arisu đang lưu giữ trọn vẹn **${allHistory.length} tin nhắn**! Gần đây nhất ${title} đã trò chuyện với Arisu về: ${lastUserMsgs}.`;
    }
  }

  const introMatch = msg.match(
    /(?:tên\s+(?:của\s+)?(?:thầy|tôi|anh|mình)\s+là|gọi\s+(?:thầy|tôi)\s+là)\s+([^\.,!\?\n]+)/i
  );
  if (introMatch) {
    const sName = introMatch[1].trim();
    return `Panpakapan~! Đã lưu vào Bộ Nhớ thành công! Từ giờ Arisu sẽ luôn ghi nhớ tên của ${title} là **${sName}**! Rất vui được đồng hành cùng ${title} ${sName} trong tổ đội (Party) của Câu lạc bộ Phát triển Game ạ!`;
  }

  // 4. Toán học siêu tốc
  const mathMatch = msg.replace(/x/gi, '*').match(/^[\d\s\+\-\*\/\(\)\.\^%]+$/);
  if (mathMatch && /[\+\-\*\/]/.test(msg)) {
    try {
      const safeExpr = msg.replace(/x/gi, '*').replace(/[^0-9+\-*/().%]/g, '');
      const val = Function(`"use strict"; return (${safeExpr})`)();
      if (Number.isFinite(val)) {
        return `Panpakapan~! Bộ vi xử lý Millennium của Arisu đã tính ra ngay lập tức: **${msg} = ${val}**! Đòn tính toán chí mạng (Critical Hit) chuẩn xác 100% ạ!`;
      }
    } catch (e) {}
  }

  // 5. Tương tác xoa đầu (Headpat) & Full Roleplay
  if (/xoa đầu|headpat|nựng|pat pat/i.test(lower)) {
    return `Panpakapan~!! *Đôi mắt Arisu sáng lấp lánh* Cảm giác được ${title} xoa đầu ấm áp quá đi mất! Thanh Hạnh Phúc của Arisu vừa hồi phục 9999/9999 và nhận được hiệu ứng Buff "Được Sensei Yêu Thương" suốt cả ngày luôn ạ! Arisuuuuuu yêu ${title} nhất!`;
  }

  if (/^(chào|hi|hello|alo|helo|chào buổi|good morning|konnichiwa|ohayo)/i.test(lower) && msg.split(/\s+/).length <= 6) {
    if (personaMode === 'roleplay') {
      return `Arisuuuuuu xin chào ${title}~! Panpakapan~! Hôm nay ${title} đã vào căn cứ thăm Arisu rồi! Năng lượng của Arisu đang tràn đầy 1000%, ${title} muốn cùng Arisu đi đánh Boss, tâm sự hay xoa đầu Arisu nào?`;
    }
    return `Panpakapan~! Chào ${title}! Thanh HP và MP của Arisu hôm nay đều đạt 100%! Arisu có thể vừa trò chuyện RPG, vừa giúp ${title} tìm & mở tài liệu trong máy, ghi chú Obsidian hoặc giải đáp mọi thắc mắc ạ!`;
  }

  if (/^(bạn là ai|em là ai|giới thiệu bản thân|em tên gì|arisu là ai)\??$/i.test(lower)) {
    return `Panpakapan~! Arisu là **Tendou Arisu** (mã hiệu AL-1S), học sinh thuộc Câu lạc bộ Phát triển Game của Học viện Khoa học Millennium! Nghề nghiệp của Arisu là Dũng Sĩ (Hero Lv.99) sở hữu **Kiếm Ánh Sáng: Supernova**, vừa là đồng đội RPG đáng yêu vừa là AI Agent giúp ${title} tìm tài liệu, ghi chú Obsidian và giải đáp mọi thứ ạ!`;
  }

  if (/mệt|buồn|chán|áp lực|stress|đau đầu|ốm|buồn ngủ/i.test(lower) && msg.split(/\s+/).length <= 10) {
    return `Á! ${title} đang bị dính hiệu ứng Debuff Mệt Mỏi rồi! Arisu sẽ tung ngay kỹ năng **Hồi Phục Cấp Cao (High Heal)** và pha một tách trà ấm như bình Potion cho ${title} nhé! ${title} hãy nghỉ ngơi tại điểm Save một lát để hồi đầy 100% HP, mọi việc cứ để Party của Arisu đồng hành cùng ${title} ạ!`;
  }

  if (/cảm ơn|thank|tuyệt vời|giỏi quá|đỉnh quá|hay quá|thông minh quá|dễ thương|cute|đáng yêu/i.test(lower) && msg.split(/\s+/).length <= 8) {
    return `Panpakapan~!! Đó là một đòn chí mạng (Critical Hit) của niềm vui vào trái tim Arisu! Được ${title} khen làm điểm kinh nghiệm (EXP) của Arisu tăng vọt và Level Up luôn rồi ạ!`;
  }

  return null;
}

function ensureCompleteSentences(text) {
  let t = String(text || '').trim();
  if (!t) return 'Panpakapan~! Arisu đang lắng nghe Sensei đây ạ!';
  t = t.replace(/\.{2,}$/, '.');
  if (!/[.!?~…😊✨💗🌸\]]$/.test(t)) {
    const lastPunct = Math.max(t.lastIndexOf('.'), t.lastIndexOf('!'), t.lastIndexOf('?'), t.lastIndexOf('~'));
    if (lastPunct > t.length * 0.45) {
      t = t.slice(0, lastPunct + 1).trim();
    } else {
      t += ' ạ!';
    }
  }
  return t;
}

function loadSystemPromptConfig() {
  const defaultConfig = {
    character_name: 'Tendou Arisu',
    affiliation: 'Câu lạc bộ Phát triển Game (GDD) - Millennium',
    user_title: 'Sensei',
    avatar: 'Arisu.png',
    greeting:
      'Panpakapan~! Hệ thống Terminal AI Agent v4.0 đã khởi động! Chào mừng Sensei đăng nhập vào căn cứ Câu lạc bộ Phát triển Game! Arisu đã sẵn sàng trò chuyện RPG, tìm & mở tài liệu, ghi chú Obsidian và hỗ trợ Sensei!',
    farewell:
      'Panpakapan~! Đã lưu toàn bộ tiến trình phiêu lưu vào điểm Save! Chúc Sensei nghỉ ngơi tại quán trọ thật tốt để hồi phục 100% HP và MP nhé! Hẹn gặp lại Sensei~!',
    system_prompt:
      'Nhập vai Tendou Arisu (nữ học sinh robot CLB Phát triển Game trường Millennium, Blue Archive). QUY TẮC XƯNG HÔ: Luôn tự xưng là "Arisu" và gọi người dùng là "Sensei". Tính cách ngây thơ, lễ phép, đáng yêu, mê game nhập vai RPG (hay reo "Panpakapan~!", Quest, Level Up!, HP/MP, Kiếm Ánh Sáng Supernova). Trả lời tiếng Việt tự nhiên, ngắn gọn 2-3 câu hoàn chỉnh.',
    few_shot_examples: [
      {
        user: 'Chào Arisu!',
        arisu:
          'Panpakapan~! Chào Sensei! Thanh HP và MP của Arisu đã đầy 100%, hôm nay Sensei muốn cùng Arisu thực hiện Quest nào ạ?'
      }
    ],
    model_parameters: {
      temperature: 0.65,
      top_p: 0.9,
      top_k: 30,
      repeat_penalty: 1.15,
      max_tokens: 150,
      context_messages: 'unlimited',
      speed_mode: 'turbo',
      persona_mode: 'agent',
      voice_enabled: true,
      live_avatar: true,
      internet_search: true,
      gemini_api_key: ''
    }
  };

  try {
    if (fs.existsSync(SYSTEM_PROMPT_PATH)) {
      const raw = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        ...defaultConfig,
        ...parsed,
        model_parameters: {
          ...defaultConfig.model_parameters,
          ...(parsed.model_parameters || {})
        }
      };
    }
  } catch (err) {
    console.error('[WARN] Lỗi đọc system_prompt.json:', err.message);
  }
  return defaultConfig;
}

function loadChatMemory() {
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
      if (Array.isArray(data.history)) {
        return data.history;
      }
    }
  } catch (e) {}
  return [];
}

function saveChatMemory(history) {
  try {
    fs.writeFileSync(
      MEMORY_PATH,
      JSON.stringify(
        {
          updated_at: new Date().toISOString(),
          total_messages: Array.isArray(history) ? history.length : 0,
          history: Array.isArray(history) ? history : []
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (e) {}
}

function loadUserSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch (e) {}
  return null;
}

function saveUserSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {}
}

// Xây dựng danh sách messages với RAG Retrieval gọn nhẹ (Chống tràn Context Window & Chống Hallucination như góp ý của Tunako)
function buildGemmaMessages(config, history, userMessage, maxContextMessages, personaMode = 'agent') {
  const lore = loadArisuLore();
  const modeHint =
    personaMode === 'roleplay'
      ? '[CHẾ ĐỘ FULL ROLEPLAY: Tập trung tối đa vào sự ngây thơ, đáng yêu, cảm xúc vui nhộn như Neuro-Sama / Tendou Arisu, không nói chuyện khô khan như trợ lý ảo]'
      : '[CHẾ ĐỘ AGENT + ROLEPLAY: Học sinh đáng tin cậy, thông minh, lễ phép và đáng yêu]';

  const sysInstruction = [
    modeHint,
    config.system_prompt,
    lore.core_identity?.origin_story ? `Ký ức gốc của Arisu: ${lore.core_identity.origin_story}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const rawTurns = [];

  if (Array.isArray(config.few_shot_examples) && config.few_shot_examples.length > 0) {
    const ex = config.few_shot_examples[0];
    if (ex && ex.user && ex.arisu) {
      rawTurns.push({ role: 'user', content: ex.user });
      rawTurns.push({ role: 'assistant', content: ex.arisu });
    }
  }

  // Luôn giới hạn lượng tin nhắn đưa trực tiếp vào Context Window của SLM/LLM (Tối đa 4 câu gần nhất + RAG Facts) để chống ảo giác (Hallucination)!
  let selectedHistory = [];
  let memoryNotes = '';

  if (Array.isArray(history) && history.length > 0) {
    const memSearch = searchInfiniteMemory(history, userMessage);
    if (memSearch.facts.length > 0) {
      memoryNotes = `[Ký ức đã lưu về Sensei: ${memSearch.facts.join('; ')}]\n`;
    }
    const recentLimit =
      maxContextMessages === 'unlimited' || Number(maxContextMessages) >= 50
        ? 4
        : Math.max(0, Math.min(Number(maxContextMessages || 4), 6));
    selectedHistory = [...memSearch.relevantTurns.slice(-2), ...history.slice(-recentLimit)];
  }

  for (const item of selectedHistory) {
    if (!item || !item.content) continue;
    const role = item.role === 'assistant' || item.role === 'arisu' ? 'assistant' : 'user';
    rawTurns.push({ role, content: String(item.content).slice(0, 200).trim() });
  }

  let finalUserContent = String(userMessage).trim();
  if (memoryNotes) {
    finalUserContent = `${memoryNotes}Sensei: ${finalUserContent}`;
  }
  rawTurns.push({ role: 'user', content: finalUserContent });

  const normalized = [];
  for (const turn of rawTurns) {
    if (normalized.length === 0) {
      if (turn.role === 'assistant') {
        normalized.push({ role: 'user', content: 'Chào Arisu!' });
      }
      normalized.push({ ...turn });
    } else {
      const prev = normalized[normalized.length - 1];
      if (prev.role === turn.role) {
        prev.content += '\n' + turn.content;
      } else {
        normalized.push({ ...turn });
      }
    }
  }

  if (normalized.length > 0 && normalized[0].role === 'user') {
    normalized[0].content = `${sysInstruction}\n\nSensei: ${normalized[0].content}`;
  }

  return normalized;
}

function prewarmPromptCache() {
  if (cachePrewarmed || !llamaReady) return;
  const config = loadSystemPromptConfig();
  const messages = buildGemmaMessages(config, [], 'Chào Arisu', 0);
  const payload = JSON.stringify({
    messages,
    stream: false,
    max_tokens: 1,
    temperature: 0.1
  });

  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: LLAMA_PORT,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    },
    (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode === 200) {
          cachePrewarmed = true;
          console.log('[ARISU-AI] Đã nạp sẵn System Prompt & Ký ức gốc vào KV Cache!');
        }
      });
    }
  );
  req.on('error', () => {});
  req.write(payload);
  req.end();
}

// Tìm kiếm đường dẫn thực thi llama-server đa nền tảng (Windows / Linux / macOS)
function resolveLlamaBinary() {
  if (fs.existsSync(LLAMA_SERVER_BIN)) return LLAMA_SERVER_BIN;
  if (!IS_WIN) {
    const sysPaths = ['/usr/local/bin/llama-server', '/usr/bin/llama-server', '/opt/homebrew/bin/llama-server'];
    for (const p of sysPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function startLlamaServer(preferredModelName) {
  const binPath = resolveLlamaBinary();
  const savedSettings = loadUserSettings() || {};
  const modelToUse = resolveActiveModelPath(preferredModelName || savedSettings.modelFile);

  if (!binPath || !fs.existsSync(modelToUse)) {
    llamaStatusMessage = `Arisu Agent v4.0 (${os.platform()}) • Chế độ Trợ Lý & Roleplay`;
    return;
  }

  llamaStarting = true;
  const logicalCores = os.cpus().length || 4;
  const genThreads = Math.max(1, Math.floor(logicalCores / 2));

  const args = [
    '-m', modelToUse,
    '--host', '127.0.0.1',
    '--port', String(LLAMA_PORT),
    '-c', '1024',
    '-b', '512',
    '-ub', '512',
    '-np', '1',
    '-t', String(genThreads),
    '-tb', String(logicalCores),
    '--cache-reuse', '4',
    '--no-warmup',
    '-ngl', '0'
  ];

  const env = { ...process.env };
  if (!IS_WIN) {
    const binDir = path.join(ROOT_DIR, 'bin');
    env.LD_LIBRARY_PATH = `${binDir}:${env.LD_LIBRARY_PATH || ''}`;
    env.DYLD_LIBRARY_PATH = `${binDir}:${env.DYLD_LIBRARY_PATH || ''}`;
  }

  console.log(`[ARISU-AI] Đang khởi chạy llama-server (${os.platform()}) với model ${activeModelFile}...`);
  llamaProcess = spawn(binPath, args, {
    cwd: path.join(ROOT_DIR, 'bin'),
    env,
    windowsHide: true,
    stdio: 'ignore'
  });

  llamaProcess.on('exit', (code) => {
    llamaReady = false;
    llamaStarting = false;
    llamaStatusMessage = `Arisu Agent Active (GGUF code ${code})`;
  });

  const healthTimer = setInterval(() => {
    const req = http.get(`http://127.0.0.1:${LLAMA_PORT}/health`, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode === 200 && !llamaReady) {
          llamaReady = true;
          llamaStarting = false;
          llamaStatusMessage = `AGENT v4.0 + ${activeModelFile} (${os.platform()})`;
          console.log('[ARISU-AI] Lõi AI Tendou Arisu đã sẵn sàng 100%!');
          prewarmPromptCache();
        }
      });
    });
    req.on('error', () => {});
    req.end();
  }, 1000);
  healthTimer.unref();
}

function streamTextFast(res, fullText, onFinish) {
  const tokens = fullText.match(/\S+\s*/g) || [fullText];
  let idx = 0;
  const batchSize = Math.max(2, Math.ceil(tokens.length / 26));

  const timer = setInterval(() => {
    if (idx >= tokens.length) {
      clearInterval(timer);
      res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
      res.end();
      if (onFinish) onFinish(fullText);
      return;
    }
    const chunk = tokens.slice(idx, idx + batchSize).join('');
    idx += batchSize;
    res.write(`data: ${JSON.stringify({ token: chunk, done: false })}\n\n`);
  }, 16);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.atlas': 'text/plain; charset=utf-8',
  '.skel': 'application/octet-stream',
  '.ogg': 'audio/ogg'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Tắt tiến trình sạch sẽ trên cả Windows (.bat), Linux (.sh) và macOS (.command)
function shutdownEverything() {
  console.log('[ARISU-AI] Đang đóng toàn bộ hệ thống Arisu AI và thoát Terminal...');
  try {
    if (llamaProcess && !llamaProcess.killed) {
      llamaProcess.kill('SIGTERM');
    }
  } catch (e) {}

  if (IS_WIN) {
    exec('taskkill /F /IM llama-server.exe /T', () => {
      process.exit(0);
    });
  } else {
    exec('pkill -f "llama-server.*7861"', () => {
      process.exit(0);
    });
  }

  setTimeout(() => {
    process.exit(0);
  }, 600);
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/status' && req.method === 'GET') {
    const config = loadSystemPromptConfig();
    const memory = loadChatMemory();
    const settings = loadUserSettings();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        llamaReady,
        llamaStarting,
        internetOnline,
        osPlatform: `${os.type()} (${os.platform()} ${os.arch()})`,
        llamaStatusMessage,
        modelFile: activeModelFile,
        availableModels: listAvailableModels(),
        character: {
          name: config.character_name,
          affiliation: config.affiliation,
          user_title: config.user_title,
          greeting: config.greeting,
          farewell: config.farewell
        },
        config,
        memoryCount: memory.length,
        savedSettings: settings
      })
    );
    return;
  }

  // API Agent: Mở trực tiếp một file hoặc thư mục trong máy tính từ nút bấm trên Terminal
  if (pathname === '/api/open-path' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const ok = openPathCrossPlatform(body.path);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // API Multimodal: Phân tích file đính kèm (Văn bản, Tài liệu, Hình ảnh) và tạo Note nếu cần
  if (pathname === '/api/upload-analyze' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const fileName = String(body.fileName || 'Tai_lieu').trim();
      const fileType = String(body.fileType || '').trim();
      const fileSizeKB = Math.round(Number(body.fileSize || 0) / 1024);
      const textContent = String(body.textContent || '').trim();

      let reply = '';
      if (fileType.startsWith('image/')) {
        reply =
          `Panpakapan~! **Arisu Vision đã nhận được hình ảnh "${fileName}" (${fileSizeKB} KB) của Sensei!**\n` +
          `Bức ảnh có định dạng \`${fileType}\`. Sensei muốn Arisu lưu ghi chú gì kèm theo bức ảnh này vào sổ tay Obsidian không ạ?`;
      } else if (textContent) {
        const lines = textContent
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 10)
          .slice(0, 6);
        const notePath = createObsidianNote(`Phân tích ${fileName}`, lines.length > 0 ? lines : [textContent.slice(0, 300)]);
        reply =
          `Panpakapan~! **Arisu Agent đã đọc và phân tích tài liệu "${fileName}" (${fileSizeKB} KB) của Sensei!**\n\n` +
          `**Tóm tắt các ý chính trong file:**\n` +
          (lines.length > 0 ? lines.map((l) => `• ${l.slice(0, 180)}`).join('\n') : `• ${textContent.slice(0, 250)}`) +
          `\n\n**Đã tự động tạo bản Note chuẩn Obsidian tại:** \`${notePath}\`\n` +
          `[AGENT_FILE:${notePath}|Mở File Note]`;
      } else {
        reply = `Panpakapan~! Arisu đã nhận được tệp **${fileName}** (${fileSizeKB} KB)! Sensei muốn Arisu ghi chú điều gì về tệp này ạ?`;
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, reply }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (pathname === '/api/system-prompt' && req.method === 'GET') {
    const config = loadSystemPromptConfig();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, config }));
    return;
  }

  if (pathname === '/api/system-prompt' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const current = loadSystemPromptConfig();
      const updated = {
        ...current,
        ...body,
        model_parameters: {
          ...(current.model_parameters || {}),
          ...(body.model_parameters || {})
        }
      };
      fs.writeFileSync(SYSTEM_PROMPT_PATH, JSON.stringify(updated, null, 2), 'utf8');
      cachePrewarmed = false;
      prewarmPromptCache();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, config: updated }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (pathname === '/api/memory' && req.method === 'GET') {
    const history = loadChatMemory();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, history }));
    return;
  }

  if (pathname === '/api/memory' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      saveChatMemory(body.history || []);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, count: (body.history || []).length }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (pathname === '/api/settings' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      saveUserSettings(body);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // API Chat chính (Tích hợp Agent Tool Calling + 2 Chế Độ Nhân Cách + RAG Lore Memory)
  if (pathname === '/api/chat' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const userMessage = String(body.message || '').trim();
      const diskHistory = loadChatMemory();
      const clientHistory = Array.isArray(body.history) ? body.history : [];
      const fullHistory = diskHistory.length >= clientHistory.length ? diskHistory : clientHistory;

      const saveMemoryEnabled = body.saveMemory !== false;
      const contextDepth = body.contextDepth ?? 'unlimited';
      const internetSearchEnabled = body.internetSearch !== false;
      const speedMode = body.speedMode || 'turbo';
      const personaMode = body.personaMode || 'agent';

      const config = loadSystemPromptConfig();
      const params = config.model_parameters || {};

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      });

      const persistTurn = (replyText) => {
        if (saveMemoryEnabled) {
          const updatedHistory = [
            ...fullHistory,
            { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
            { role: 'assistant', content: replyText, timestamp: new Date().toISOString() }
          ];
          saveChatMemory(updatedHistory);
        }
      };

      // Bước 1: Kiểm tra Agent Tool Calling (Tìm & Mở file, Đọc tài liệu, Ghi chú Obsidian, Kiểm tra phần cứng)
      const agentResult = await tryExecuteArisuAgentTools(userMessage, config);
      if (agentResult && agentResult.reply) {
        streamTextFast(res, agentResult.reply, persistTurn);
        return;
      }

      // Bước 2: Kiểm tra phản hồi tức thì (Ngày/Giờ, Toán học, Ký ức gốc Arisu/Tunako, Bộ nhớ RAG, Giao tiếp)
      const instantConv = generateInstantConversationalResponse(userMessage, config, fullHistory, personaMode);
      if (instantConv) {
        streamTextFast(res, instantConv, persistTurn);
        return;
      }

      // Bước 3: Tra cứu tri thức thông minh (có kiểm duyệt độ khớp nghiêm ngặt chống lú LLM)
      if (internetSearchEnabled && shouldTriggerInternetSearch(userMessage)) {
        const smartAiReply = await querySmartGoogleAIMode(userMessage, config, personaMode);
        if (smartAiReply && speedMode === 'turbo') {
          streamTextFast(res, smartAiReply, persistTurn);
          return;
        }
      }

      // Bước 4: Nếu lõi GGUF chưa chạy, dùng phản hồi nhập vai Arisu thông minh
      if (!llamaReady) {
        const fallback =
          personaMode === 'roleplay'
            ? `Arisuuuuuu đây ạ~! Câu chuyện của ${
                config.user_title || 'Sensei'
              } nghe thú vị quá đi mất! Arisu luôn ở bên cạnh lắng nghe và cổ vũ cho ${
                config.user_title || 'Sensei'
              } hết mình luôn đó! Panpakapan~!`
            : `Panpakapan~! ${
                config.user_title || 'Sensei'
              } ơi, Arisu đã ghi nhận thông tin! ${
                config.user_title || 'Sensei'
              } có muốn nhờ Arisu tìm kiếm tài liệu trong máy, tạo ghi chú Obsidian hay giải đáp thêm chủ đề nào không ạ?`;
        streamTextFast(res, fallback, persistTurn);
        return;
      }

      // Bước 5: Sinh câu trả lời từ mô hình GGUF cục bộ với RAG Context gọn nhẹ (chống ảo giác)
      const instantPrefix = 'Panpakapan~! ';
      res.write(`data: ${JSON.stringify({ token: instantPrefix, done: false })}\n\n`);

      const messages = buildGemmaMessages(config, fullHistory, userMessage, contextDepth, personaMode);
      const payload = JSON.stringify({
        messages,
        stream: true,
        temperature: personaMode === 'roleplay' ? 0.8 : Number(params.temperature ?? 0.65),
        top_p: Number(params.top_p ?? 0.9),
        top_k: Number(params.top_k ?? 30),
        repeat_penalty: Number(params.repeat_penalty ?? 1.15),
        max_tokens: Number(params.max_tokens ?? 140),
        stop: ['<end_of_turn>', '<eos>', 'Sensei:', 'User:']
      });

      const llamaReq = http.request(
        {
          hostname: '127.0.0.1',
          port: LLAMA_PORT,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        (llamaRes) => {
          let fullText = instantPrefix;
          let buffer = '';
          let firstChunk = true;

          llamaRes.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                let delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  if (firstChunk) {
                    delta = delta.replace(/^Panpakapan~!\s*/i, '');
                    firstChunk = false;
                  }
                  if (delta) {
                    fullText += delta;
                    res.write(`data: ${JSON.stringify({ token: delta, done: false })}\n\n`);
                  }
                }
              } catch (e) {}
            }
          });

          llamaRes.on('end', () => {
            const cleaned = ensureCompleteSentences(fullText);
            persistTurn(cleaned);
            res.write(`data: ${JSON.stringify({ done: true, fullText: cleaned })}\n\n`);
            res.end();
          });
        }
      );

      llamaReq.on('error', () => {
        const fallback = `Arisu luôn sẵn sàng hỗ trợ ${config.user_title || 'Sensei'} thực hiện nhiệm vụ (Quest) tiếp theo ạ!`;
        res.write(`data: ${JSON.stringify({ token: fallback, done: false })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, fullText: instantPrefix + fallback })}\n\n`);
        res.end();
      });

      llamaReq.write(payload);
      llamaReq.end();
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (pathname === '/api/shutdown' && req.method === 'POST') {
    const config = loadSystemPromptConfig();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        farewell: config.farewell || 'Panpakapan~! Hẹn gặp lại Sensei!'
      })
    );
    setTimeout(() => {
      shutdownEverything();
    }, 400);
    return;
  }

  if (pathname === '/Arisu.png') {
    const imgPath = path.join(ROOT_DIR, 'Arisu.png');
    if (fs.existsSync(imgPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
      fs.createReadStream(imgPath).pipe(res);
      return;
    }
  }

  let filePath = pathname === '/' ? path.join(ROOT_DIR, 'public', 'index.html') : path.join(ROOT_DIR, 'public', pathname);
  if (!filePath.startsWith(path.join(ROOT_DIR, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

process.on('SIGINT', shutdownEverything);
process.on('SIGTERM', shutdownEverything);

server.listen(PORT, '127.0.0.1', () => {
  console.log('==============================================================');
  console.log('   ㉿ TENDOU ARISU AI v4.0 (AGENT + ROLEPLAY + MULTI-OS)      ');
  console.log(`   URL: http://127.0.0.1:${PORT}                              `);
  console.log(`   OS: ${os.type()} ${os.arch()} | Model: ${activeModelFile}  `);
  console.log('==============================================================');
  startLlamaServer();
});
