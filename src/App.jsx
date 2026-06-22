import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import { UploadCloud, Search, Download, RotateCcw, Users, Database, CheckCircle2, Trash2, Star, Pencil, FileSpreadsheet } from 'lucide-react';
import './style.css';

const SUP_KEY = 'galil_suppliers_v8_excel_fixed';
const logo = '/galil-logo.webp';

const clean = value => String(value ?? '').replace(/[\u200e\u200f]/g, '').replace(/\s+/g, ' ').trim();
const norm = value => clean(value)
  .replace(/["׳'`’‘״]/g, '')
  .replace(/[\.\/\\\-_:()\[\]{}]/g, '')
  .replace(/\s+/g, '')
  .toLowerCase();

function getVal(row, aliases) {
  const map = {};
  Object.keys(row || {}).forEach(key => { map[norm(key)] = row[key]; });
  for (const alias of aliases) {
    const value = map[norm(alias)];
    if (value !== undefined && value !== null && clean(value) !== '') return clean(value);
  }
  return '';
}

const CATEGORIES = [
  'BIM','CAD / הנדסה','E-commerce','EPC','HVAC','IT','אבטחה','אדריכלות','אדריכלות נוף','אוטומציה','איכות','איכות סביבה','איטום','אלומיניום','אנרגיה','בקרה','בטיחות','בטיחות אש','בידוד','ביטוח','בנייה','גז / אנרגיה','גז טבעי','גיאוטכניקה','דפוס','הדרכה','הובלה / מנוף','הנדסה','חשמל','כיבוי אש','כימיה','לוגיסטיקה','מדידות','מים','מכשור ובקרה','משפטי','מתכת','ניהול פרויקטים','ציוד טכני','קבלנות / שירותים','תוכנה','תקשורת','כללי / אחר'
];

function inferCategory(name = '', description = '', explicit = '') {
  const manual = clean(explicit);
  if (manual) return manual;
  const text = `${name} ${description}`.toLowerCase();
  const rules = [
    ['חשמל', ['חשמל', 'electric', 'כבל', 'לוחות', 'שניידר', 'siemens', 'abb']],
    ['מכשור ובקרה', ['מכשור', 'בקרה', 'instrument', 'control', 'sensor', 'plc', 'scada']],
    ['כיבוי אש', ['כיבוי', 'אש', 'sprinkler', 'fire', 'כבאות']],
    ['HVAC', ['מיזוג', 'אוורור', 'קירור', 'hvac', 'chiller']],
    ['גז טבעי', ['גז טבעי', 'natural gas']],
    ['מים', ['מים', 'התפלה', 'טיהור', 'משאבות', 'water']],
    ['לוגיסטיקה', ['שילוח', 'לוגיסטיקה', 'הובלה', 'מטען', 'cargo', 'dhl', 'fedex']],
    ['מדידות', ['מדידות', 'מיפוי', 'מודד', 'survey', 'gis']],
    ['גיאוטכניקה', ['גיאוטכניקה', 'ביסוס', 'קרקע', 'קידוחי ניסיון']],
    ['מתכת', ['מתכת', 'מסגר', 'ריתוך', 'קונסטרוקציה', 'פלדה']],
    ['איטום', ['איטום', 'סנפלינג', 'גגות']],
    ['בטיחות', ['בטיחות', 'גהות', 'מיגון', 'ppe']],
    ['בנייה', ['בניה', 'בנייה', 'בנין', 'בניין', 'קבלן']],
    ['אדריכלות', ['אדריכל', 'אדריכלות']],
    ['משפטי', ['עורך דין', 'עו"ד', 'משפט', 'נוטריון']],
    ['IT', ['מחשוב', 'תוכנה', 'שרת', 'ענן', 'network', 'it']],
  ];
  for (const [category, words] of rules) {
    if (words.some(word => text.includes(word.toLowerCase()))) return category;
  }
  return 'כללי / אחר';
}

const FIELD_ALIASES = {
  supplierNo: ["מס' ספק", "מס׳ ספק", 'מס ספק', 'מספר ספק', "מס' ספק/קבלן", 'supplierNo', 'supplier number'],
  name: ['שם ספק', 'שם ספק/קבלן', 'ספק', 'שם', 'supplier', 'vendor'],
  field: ['תחום', 'תחום קצר', 'תחום עיסוק', 'קטגוריה', 'discipline', 'category'],
  description: ['תחום פעילות מורחב', 'תיאור פעילות', 'תיאור', 'תאור', 'תאור הסעיף/פרק', 'description'],
  address: ['כתובת', 'address'],
  cityCountry: ['עיר ומדינה', 'עיר', 'city', 'cityCountry'],
  zip: ['מיקוד', 'zip'],
  country: ['ארץ', 'מדינה', 'country'],
  phone: ['מספר טלפון', 'טלפון', 'נייד', 'phone', 'mobile'],
  fax: ['פקס', 'fax'],
  contact: ['איש קשר', 'contact'],
  certainty: ['ודאות', 'רמת ודאות'],
  notes: ['הערות', 'notes']
};

function supplierFromRow(row, index) {
  const name = getVal(row, FIELD_ALIASES.name);
  const supplierNo = getVal(row, FIELD_ALIASES.supplierNo);
  const field = getVal(row, FIELD_ALIASES.field);
  const description = getVal(row, FIELD_ALIASES.description);
  const supplier = {
    id: `${supplierNo || name || 'row'}-${index}`,
    supplierNo,
    name,
    field: inferCategory(name, description, field),
    description,
    address: getVal(row, FIELD_ALIASES.address),
    cityCountry: getVal(row, FIELD_ALIASES.cityCountry),
    zip: getVal(row, FIELD_ALIASES.zip),
    country: getVal(row, FIELD_ALIASES.country),
    phone: getVal(row, FIELD_ALIASES.phone),
    fax: getVal(row, FIELD_ALIASES.fax),
    contact: getVal(row, FIELD_ALIASES.contact),
    certainty: getVal(row, FIELD_ALIASES.certainty) || (field || description ? 'גבוהה' : 'בינונית'),
    notes: getVal(row, FIELD_ALIASES.notes),
    rating: 0
  };
  return supplier;
}

function findHeaderRow(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const normalized = rows[i].map(norm);
    if (normalized.some(h => h.includes('שםספק') || h === 'ספק') && normalized.some(h => h.includes('תחום') || h.includes('מסספק'))) return i;
  }
  return 0;
}

function parseWorkbook(workbook) {
  const sheetName = workbook.SheetNames.find(name => /datasheet|ספק|supplier/i.test(name)) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const headerRow = findHeaderRow(sheet);
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, range: headerRow });
  return rows
    .map(supplierFromRow)
    .filter(s => s.name || s.supplierNo || s.description)
    .map((s, i) => ({ ...s, id: `${s.supplierNo || 'supplier'}-${i}` }));
}

function supplierToExport(s) {
  return {
    "מס' ספק": s.supplierNo,
    'שם ספק': s.name,
    'תחום': s.field,
    'תחום פעילות מורחב': s.description,
    'כתובת': s.address,
    'עיר ומדינה': s.cityCountry,
    'מיקוד': s.zip,
    'ארץ': s.country,
    'מספר טלפון': s.phone,
    'פקס': s.fax,
    'ודאות': s.certainty,
    'הערות': s.notes
  };
}

function App() {
  const fileRef = useRef(null);
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState('');
  const [field, setField] = useState('הכל');
  const [message, setMessage] = useState('טוען נתונים...');

  useEffect(() => {
    const saved = localStorage.getItem(SUP_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSuppliers(parsed);
        setMessage(`נטענו ${parsed.length.toLocaleString('he-IL')} ספקים מהדפדפן.`);
        return;
      } catch {}
    }
    fetch('/suppliers.json')
      .then(res => res.ok ? res.json() : Promise.reject(new Error('no data file')))
      .then(data => {
        const list = (data.suppliers || []).map((s, i) => ({ ...s, id: `${s.supplierNo || 'supplier'}-${i}`, rating: 0, certainty: s.certainty || 'גבוהה' }));
        setSuppliers(list);
        setMessage(`נטענו ${list.length.toLocaleString('he-IL')} ספקים מקובץ האתר.`);
      })
      .catch(() => setMessage('אפשר להעלות Excel בפורמט ספקים.'));
  }, []);

  useEffect(() => {
    if (suppliers.length) localStorage.setItem(SUP_KEY, JSON.stringify(suppliers));
  }, [suppliers]);

  const fields = useMemo(() => ['הכל', ...Array.from(new Set([...CATEGORIES, ...suppliers.map(s => s.field).filter(Boolean)])).sort((a, b) => a.localeCompare(b, 'he'))], [suppliers]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return suppliers.filter(s => {
      const matchesField = field === 'הכל' || s.field === field;
      const haystack = `${s.supplierNo} ${s.name} ${s.field} ${s.description} ${s.address} ${s.cityCountry} ${s.country} ${s.phone} ${s.fax} ${s.contact} ${s.notes}`.toLowerCase();
      return matchesField && haystack.includes(q);
    });
  }, [suppliers, query, field]);

  const stats = useMemo(() => {
    const map = new Map();
    suppliers.forEach(s => map.set(s.field || 'כללי / אחר', (map.get(s.field || 'כללי / אחר') || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [suppliers]);

  const uploadExcel = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true, raw: false });
        const parsed = parseWorkbook(workbook);
        setSuppliers(parsed);
        setField('הכל');
        setQuery('');
        setMessage(`נטענו ${parsed.length.toLocaleString('he-IL')} ספקים מתוך ${file.name}.`);
      } catch (error) {
        console.error(error);
        setMessage('שגיאה בקריאת האקסל. בדוק שיש עמודות שם ספק / תחום / תיאור.');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(supplierToExport));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
    XLSX.writeFile(wb, 'galil-suppliers-filtered.xlsx');
  };

  const updateSupplier = (id, patch) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const deleteSupplier = id => setSuppliers(prev => prev.filter(s => s.id !== id));
  const resetData = () => {
    localStorage.removeItem(SUP_KEY);
    window.location.reload();
  };

  return (
    <div className="app" dir="rtl">
      <header className="top">
        <div className="brand">
          <img src={logo} alt="Galil" />
          <div>
            <span>GALIL GROUP</span>
            <h1>מאגר ספקים</h1>
            <p>טעינה נקייה מהאקסל, חיפוש, סינון וייצוא</p>
          </div>
        </div>
      </header>

      <main className="supPage">
        <section className="panel supHero">
          <div>
            <h2><Users /> מאגר ספקים וקבלנים</h2>
            <p>המערכת קוראת את הגיליון הנכון, מזהה כותרות בעברית, ושומרת את הנתונים בדפדפן.</p>
            <div className="status"><CheckCircle2 size={16} />{message}</div>
          </div>
          <div className="actions">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={uploadExcel} />
            <button onClick={() => fileRef.current.click()}><UploadCloud size={18} /> העלאת Excel</button>
            <button onClick={exportExcel}><Download size={18} /> ייצוא Excel</button>
            <button onClick={resetData}><RotateCcw size={18} /> איפוס נתונים</button>
          </div>
        </section>

        <section className="supplierControls panel">
          <div className="search big"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש לפי שם, מספר ספק, תחום, טלפון, עיר או תיאור" /></div>
          <select value={field} onChange={e => setField(e.target.value)}>{fields.map(x => <option key={x}>{x}</option>)}</select>
        </section>

        <section className="stats">
          <div className="stat"><b>{suppliers.length.toLocaleString('he-IL')}</b><span>סה״כ ספקים</span></div>
          <div className="stat"><b>{filtered.length.toLocaleString('he-IL')}</b><span>בתצוגה</span></div>
          {stats.map(([name, count]) => <div className="stat" key={name}><b>{count.toLocaleString('he-IL')}</b><span>{name}</span></div>)}
        </section>

        <section className="supplierGrid">
          {filtered.map(s => (
            <article className="supplier" key={s.id}>
              <div className="supplierTop">
                <div>
                  <span>{s.field || 'כללי / אחר'}</span>
                  <h3>{s.name || 'ספק ללא שם'}</h3>
                  <p>מס׳ ספק: {s.supplierNo || '-'} · ודאות: {s.certainty || '-'}</p>
                </div>
                <button className="danger" onClick={() => deleteSupplier(s.id)}><Trash2 size={16} /></button>
              </div>
              <p className="desc">{s.description || 'אין תיאור פעילות'}</p>
              <div className="supplierMeta">
                <span>כתובת: {[s.address, s.cityCountry, s.zip, s.country].filter(Boolean).join(', ') || '-'}</span>
                <span>טלפון: {s.phone || '-'}</span>
                <span>פקס: {s.fax || '-'}</span>
              </div>
              <div className="editRow"><label><Pencil size={14} /> תחום</label><input value={s.field || ''} onChange={e => updateSupplier(s.id, { field: e.target.value })} /></div>
              <div className="rating">{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => updateSupplier(s.id, { rating: n })} className={n <= (s.rating || 0) ? 'on' : ''}><Star size={20} fill="currentColor" /></button>)}</div>
              <textarea value={s.notes || ''} onChange={e => updateSupplier(s.id, { notes: e.target.value })} placeholder="הערות על הספק" />
            </article>
          ))}
        </section>

        {!filtered.length && <section className="panel empty"><FileSpreadsheet /> לא נמצאו ספקים לפי החיפוש הנוכחי.</section>}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
