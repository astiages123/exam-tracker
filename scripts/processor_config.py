"""
Yapılandırma Modülü (processor_config.py)
========================================
Ayarlar, loglama ve sabitlerin tanımlandığı modül.
"""

import os
import re
import sys
import logging
import json
from pathlib import Path

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.FileHandler("processor.log", mode='w', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)
logging.getLogger("bs4").setLevel(logging.WARNING)

# ============================================================================
# YAPILANDIRMA
# ============================================================================

def load_config(config_path='config.json'):
    """
    Yapılandırma dosyasını yükler. Yoksa varsayılan değerlerle oluşturur.
    """
    default_config = {
        "paths": {
            "input_dir": "input",
            "output_dir": "public/notlar",
            "media_path": "media/"
        },
        "files": {
            "css_file": "not_stilleri.css",
            "js_file": "notes.js"
        },
        "patterns": {
            "example_keywords": ["Örnek", "Örnekler"],
            "question_keywords": ["Soru", "Çözüm", "Cevap", "Yanıt"],
            "example_pattern": r"^\s*([Öö]rnek(?:ler)?)\s*(\d*)\s*:?\s*$",
            "question_pattern": r"^\s*Soru\s*\d*[^:]*:",
            "label_pattern": r"^(Çözüm|Cevap|Yanıt|Soru)\s*(\d*)([^:]*?)\s*:?\s*$"
        },
        "features": {
            "wrap_numbers": True,
            "add_toc": True,
            "convert_examples": True,
            "enhance_math": True,
            "hierarchical_numbering": True
        },
        "logging": {
            "log_file": "processor.log",
            "console_level": "INFO"
        }
    }
    
    config_file = Path(__file__).parent / config_path
    
    if config_file.exists():
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                user_config = json.load(f)
                for key, value in user_config.items():
                    if key in default_config and isinstance(value, dict):
                        default_config[key].update(value)
                    else:
                        default_config[key] = value
                logger.info(f"Yapılandırma yüklendi: {config_file}")
                return default_config
        except Exception as e:
            logger.error(f"Config dosyası okunamadı, varsayılanlar kullanılıyor: {e}")
            return default_config
    
    try:
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
        print("ℹ️  config.json oluşturuldu.")
        logger.info(f"Yeni yapılandırma dosyası oluşturuldu: {config_file}")
    except Exception as e:
        logger.error(f"Config dosyası oluşturulamadı: {e}")
        
    return default_config

# Global değişkenleri config'den al
config = load_config()

BASE_DIR = Path(__file__).parent.parent
INPUT_DIR = BASE_DIR / config['paths']['input_dir']
OUTPUT_DIR = BASE_DIR / config['paths']['output_dir']
MEDIA_PATH = config['paths']['media_path']

CSS_FILE = config['files']['css_file']
JS_FILE = config['files']['js_file']

# ============================================================================
# PATTERNS
# ============================================================================

RE_NUMBER = re.compile(r'(?<!\w)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?!\w)')
RE_SLUG_NON_ALPHANUM = re.compile(r'[^\w\s-]')
RE_SLUG_DASHES = re.compile(r'[-\s]+')
TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")

def compile_patterns(config_patterns):
    """Compile frequently used patterns from configuration."""
    patterns = {
        'example': re.compile(config_patterns['example_pattern'], re.IGNORECASE),
        'question_start': re.compile(config_patterns['question_pattern'], re.IGNORECASE),
        'label_only': re.compile(config_patterns['label_pattern'], re.IGNORECASE),
    }
    
    kw_list = config_patterns['question_keywords']
    patterns['label_with_content'] = re.compile(
        fr'^({"|".join(kw_list)})\s*(\d*)([^:]*?)\s*:\s*(.+)$', 
        re.IGNORECASE | re.DOTALL
    )
    
    label_starts = tuple(k.lower() for k in kw_list)
    
    return patterns, label_starts

PATTERNS, LABEL_STARTS = compile_patterns(config['patterns'])

# Compatibility aliases
RE_EXAMPLE = PATTERNS['example']
RE_QUESTION_START = PATTERNS['question_start']
RE_LABEL_ONLY = PATTERNS['label_only']
RE_LABEL_WITH_CONTENT = PATTERNS['label_with_content']
