import re
import os

files_to_process = [
    r"c:\Users\Lenovo\Desktop\Folder RIFKY\Rifky\Sistem Registrasi KPU\kpu-sumsel-registrasi\frontend\src\pages\CheckIn.jsx",
    r"c:\Users\Lenovo\Desktop\Folder RIFKY\Rifky\Sistem Registrasi KPU\kpu-sumsel-registrasi\frontend\src\pages\Admin.jsx",
    r"c:\Users\Lenovo\Desktop\Folder RIFKY\Rifky\Sistem Registrasi KPU\kpu-sumsel-registrasi\frontend\src\components\FormRegistrasi.jsx"
]

def process_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inputs and Selects
    content = re.sub(r'<input([^>]+?)className="[^"]*"', r'<input\1className="input-kpu"', content)
    # Exclude checkbox and file inputs from input-kpu
    content = re.sub(r'<input([^>]+?)type="(?:checkbox|file)"([^>]*?)className="input-kpu"', r'<input\1type="\2"\3', content)

    content = re.sub(r'<select([^>]+?)className="[^"]*"', r'<select\1className="select-kpu"', content)
    
    # Labels
    content = re.sub(r'<label([^>]+?)className="[^"]*"', r'<label\1className="kpu-form-label"', content)

    # Badges in Admin.jsx
    content = re.sub(r'className={`px-2 py-1 text-xs font-semibold rounded-full \${[^}]+}`}', r'className={`kpu-badge kpu-badge-${peserta.status.toLowerCase()}`}', content)
    content = re.sub(r'className={`px-2 py-1 text-xs font-semibold rounded-full [^`]+`}', r'className={`kpu-badge kpu-badge-${peserta.status.toLowerCase()}`}', content)

    # Buttons in Admin.jsx Table (Hadir / Hapus)
    content = re.sub(r'className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"', 'className="btn-kpu" style={{padding:"5px 10px", fontSize:"12px"}}', content)
    content = re.sub(r'className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded hover:bg-red-200"', 'className="btn-kpu-danger" style={{padding:"5px 10px", fontSize:"12px"}}', content)
    
    # Stat cards in Admin.jsx
    content = re.sub(r'className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"', 'className="kpu-stat-card flex items-center gap-4"', content)
    
    # Table header in Admin.jsx
    content = re.sub(r'<thead className="bg-\[\#0D1B3E\] text-white">', r'<thead style={{background:"#faf5f5", color:"var(--kpu-maroon)"}}>', content)
    content = re.sub(r'<tr className="hover:bg-gray-50 border-b">', r'<tr className="border-b" style={{backgroundColor:"#fff"}} onMouseEnter={(e)=>e.currentTarget.style.backgroundColor="#fdf9f9"} onMouseLeave={(e)=>e.currentTarget.style.backgroundColor="#fff"}>', content)
    
    # Section Header (Admin.jsx and CheckIn.jsx panels)
    # Using python regex to find basic patterns if applicable
    content = re.sub(
        r'<div className="flex items-center gap-3 mb-6 relative">\n(.*?)<h3 className="font-display font-semibold text-lg text-\[\#0D1B3E\]">(.*?)</h3>',
        r'<div className="kpu-section-header mb-6" style={{zIndex:1}}>\n\1<div className="kpu-dots"/><div className="kpu-line-gold"/><h3 className="kpu-section-title">\2</h3>',
        content,
        flags=re.DOTALL
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Processed: {filepath}")

for f in files_to_process:
    process_file(f)
