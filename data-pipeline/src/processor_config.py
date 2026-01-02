
import json
import logging
import sys
import re
from pathlib import Path

# Determine project root
# structure: root/data-pipeline/src/processor_config.py
# so root is ../../
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent

# Define critical paths
CONFIG_DIR = PROJECT_ROOT / 'data-pipeline' / 'config'
CONFIG_PATH = CONFIG_DIR / 'config.json'
LOG_DIR = PROJECT_ROOT / 'data-pipeline' / 'logs'

# Ensure log directory exists
LOG_DIR.mkdir(parents=True, exist_ok=True)

def load_config():
    if not CONFIG_PATH.exists():
        print(f"CRITICAL: Config file not found at {CONFIG_PATH}")
        sys.exit(1)
    
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"CRITICAL: Error loading config: {e}")
        sys.exit(1)

config = load_config()

# Resolve Paths
# Input dir is relative to project root
INPUT_DIR = PROJECT_ROOT / config['paths']['input_dir']

# Output dir - handle legacy "public/notlar" if config is not updated
_out_path = config['paths']['output_dir']
if _out_path == 'public/notlar':
    _out_path = 'public/content'

OUTPUT_DIR = PROJECT_ROOT / _out_path
MEDIA_PATH = OUTPUT_DIR / 'media' # Or whatever logic was used

# Setup Logging
log_file_name = config['logging']['log_file']
LOG_FILE = LOG_DIR / log_file_name

logger = logging.getLogger('Processor')
logger.setLevel(logging.INFO)

# File Handler
fh = logging.FileHandler(LOG_FILE, encoding='utf-8')
fh.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)

# Console Handler
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
ch.setFormatter(formatter)
logger.addHandler(ch)

# -----------------------------------------------------------------------------
# CONSTANTS & REGEX DEFINITIONS (Restored)
# -----------------------------------------------------------------------------

CSS_FILE = 'not_stilleri.css'
JS_FILE = 'notes.js'

# Regex Patterns for DOM Handling
RE_NUMBER = re.compile(r'\b(\d+(?:[.,]\d+)?)\b')
RE_EXAMPLE = re.compile(r'^(Örnek|Örnekler)(?:\s+(\d+))?\s*(:)?\s*(.*)', re.IGNORECASE)
RE_QUESTION_START = re.compile(r'^(Soru|Çözüm|Cevap|Yanıt)(?:\s+(\d+))?\s*(:)?', re.IGNORECASE)

RE_LABEL_ONLY = re.compile(r'^(Soru|Çözüm|Cevap|Yanıt|Örnek)\s*(\d*)\s*(:)\s*$', re.IGNORECASE)
RE_LABEL_WITH_CONTENT = re.compile(r'^(Soru|Çözüm|Cevap|Yanıt|Örnek)\s*(\d*)\s*(:)\s+(.+)$', re.IGNORECASE | re.DOTALL)

LABEL_STARTS = ('soru', 'çözüm', 'cevap', 'yanıt', 'örnek')

# Slugify Constants
TR_MAP = str.maketrans({
    'İ': 'i', 'I': 'i', 'ı': 'i',
    'Ş': 's', 'ş': 's',
    'Ğ': 'g', 'ğ': 'g',
    'Ü': 'u', 'ü': 'u',
    'Ö': 'o', 'ö': 'o',
    'Ç': 'c', 'ç': 'c'
})

RE_SLUG_NON_ALPHANUM = re.compile(r'[^a-z0-9\s-]')
RE_SLUG_DASHES = re.compile(r'[-\s]+')
