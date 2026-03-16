// HARMONI — Documents (เอกสาร) API
// GET    /api/documents              — list documents
// POST   /api/documents              — create document
// PUT    /api/documents/:id          — update
// DELETE /api/documents/:id          — delete
// GET    /api/documents/types        — list document types
// POST   /api/documents/types        — create type

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Document types
  if (path === '/api/documents/types' && method === 'GET') {
    return success(await dbAll(env.DB,
      'SELECT * FROM document_types WHERE teacher_id = ? OR is_preset = 1 ORDER BY category, name', [env.user.id]));
  }
  if (path === '/api/documents/types' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.name) return error('กรุณากรอกชื่อประเภทเอกสาร');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO document_types (id, teacher_id, name, category, template_structure, is_preset)
       VALUES (?,?,?,?,?,0)`,
      [id, env.user.id, body.name, body.category || null, body.template_structure || null]
    );
    return success({ id });
  }

  // List documents
  if (path === '/api/documents' && method === 'GET') {
    const typeId = url.searchParams.get('document_type_id');
    let sql = `SELECT d.*, dt.name as type_name, dt.category as type_category
               FROM documents d LEFT JOIN document_types dt ON dt.id = d.document_type_id
               WHERE d.teacher_id = ?`;
    const params = [env.user.id];
    if (typeId) { sql += ' AND d.document_type_id = ?'; params.push(typeId); }
    sql += ' ORDER BY d.updated_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/documents' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('กรุณากรอกชื่อเอกสาร');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO documents (id, teacher_id, document_type_id, title, content, file_url, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.document_type_id || null, body.title, body.content || null,
       body.file_url || null, body.status || 'draft', now(), now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/documents/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['document_type_id','title','content','file_url','status'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    fields.push('updated_at=?'); params.push(now());
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE documents SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM documents WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  // GET /api/documents/templates — get preset templates
  if (path === '/api/documents/templates' && method === 'GET') {
    return success(DOCUMENT_TEMPLATES);
  }

  // POST /api/documents/templates/create — create document from template
  if (path === '/api/documents/templates/create' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.template_id) return error('กรุณาระบุ template_id');
    const tpl = DOCUMENT_TEMPLATES.find(t => t.id === body.template_id);
    if (!tpl) return error('ไม่พบเทมเพลต');

    const id = generateUUID();
    const content = tpl.sections.map(s => `## ${s.title}\n${s.placeholder}`).join('\n\n');
    await dbRun(env.DB,
      `INSERT INTO documents (id, teacher_id, document_type_id, title, content, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, env.user.id, null, tpl.name, content, 'draft', now(), now()]
    );
    return success({ id, title: tpl.name });
  }

  return error('Not found', 404);
}

// 28 Thai government education document templates
const DOCUMENT_TEMPLATES = [
  { id: 'tpl-01', name: 'แผนการจัดการเรียนรู้', category: 'วิชาการ',
    sections: [
      { title: 'สาระสำคัญ', placeholder: 'ระบุสาระสำคัญของหน่วยการเรียนรู้...' },
      { title: 'มาตรฐาน/ตัวชี้วัด', placeholder: 'ระบุมาตรฐานการเรียนรู้...' },
      { title: 'จุดประสงค์การเรียนรู้', placeholder: '1. ด้านความรู้ (K)\n2. ด้านทักษะ (P)\n3. ด้านคุณลักษณะ (A)' },
      { title: 'กิจกรรมการเรียนรู้', placeholder: 'ขั้นนำ:\nขั้นสอน:\nขั้นสรุป:' },
      { title: 'สื่อ/แหล่งเรียนรู้', placeholder: 'ระบุสื่อการเรียนรู้...' },
      { title: 'การวัดและประเมินผล', placeholder: 'ระบุเครื่องมือวัดผล...' },
      { title: 'บันทึกหลังสอน', placeholder: 'ผลการจัดกิจกรรม:\nปัญหา/อุปสรรค:\nแนวทางแก้ไข:' }
    ]
  },
  { id: 'tpl-02', name: 'โครงสร้างรายวิชา', category: 'วิชาการ',
    sections: [
      { title: 'ข้อมูลรายวิชา', placeholder: 'รหัสวิชา:\nชื่อวิชา:\nกลุ่มสาระ:\nชั้น:\nเวลาเรียน: ชั่วโมง/ปี' },
      { title: 'คำอธิบายรายวิชา', placeholder: 'ระบุคำอธิบายรายวิชา...' },
      { title: 'ผลการเรียนรู้', placeholder: 'ระบุผลการเรียนรู้ที่คาดหวัง...' },
      { title: 'หน่วยการเรียนรู้', placeholder: 'หน่วยที่ 1:\nหน่วยที่ 2:' }
    ]
  },
  { id: 'tpl-03', name: 'บันทึกหลังสอน', category: 'วิชาการ',
    sections: [
      { title: 'ผลการจัดกิจกรรม', placeholder: 'นักเรียนสามารถ...' },
      { title: 'ปัญหาและอุปสรรค', placeholder: 'ระบุปัญหาที่พบ...' },
      { title: 'แนวทางแก้ไข', placeholder: 'แนวทางที่จะปรับปรุง...' }
    ]
  },
  { id: 'tpl-04', name: 'รายงานวิจัยในชั้นเรียน', category: 'วิชาการ',
    sections: [
      { title: 'ชื่อเรื่อง', placeholder: 'ระบุชื่อเรื่องวิจัย...' },
      { title: 'ความเป็นมาและสภาพปัญหา', placeholder: 'อธิบายสภาพปัญหา...' },
      { title: 'วัตถุประสงค์', placeholder: '1.\n2.' },
      { title: 'สมมติฐาน', placeholder: 'ระบุสมมติฐาน...' },
      { title: 'วิธีดำเนินการวิจัย', placeholder: 'ประชากร:\nกลุ่มตัวอย่าง:\nเครื่องมือ:\nวิธีเก็บข้อมูล:' },
      { title: 'ผลการวิจัย', placeholder: 'ผลที่ได้...' },
      { title: 'อภิปราย/สรุป', placeholder: 'สรุปผลและข้อเสนอแนะ...' }
    ]
  },
  { id: 'tpl-05', name: 'แบบบันทึกการเยี่ยมบ้าน', category: 'ระบบดูแล',
    sections: [
      { title: 'ข้อมูลนักเรียน', placeholder: 'ชื่อ-สกุล:\nชั้น/ห้อง:\nที่อยู่:' },
      { title: 'สภาพครอบครัว', placeholder: 'ผู้ปกครอง:\nอาชีพ:\nรายได้:' },
      { title: 'สภาพที่อยู่อาศัย', placeholder: 'ลักษณะบ้าน:\nสภาพแวดล้อม:' },
      { title: 'ข้อสังเกต/ข้อเสนอแนะ', placeholder: 'สิ่งที่พบ:\nแนวทางช่วยเหลือ:' }
    ]
  },
  { id: 'tpl-06', name: 'แบบบันทึกการให้คำปรึกษา', category: 'ระบบดูแล',
    sections: [
      { title: 'ข้อมูลนักเรียน', placeholder: 'ชื่อ-สกุล:\nชั้น/ห้อง:' },
      { title: 'สาเหตุ/ปัญหา', placeholder: 'ระบุสาเหตุ...' },
      { title: 'การให้คำปรึกษา', placeholder: 'วิธีการ:\nผลลัพธ์:' },
      { title: 'การติดตามผล', placeholder: 'แนวทางติดตาม...' }
    ]
  },
  { id: 'tpl-07', name: 'แบบบันทึกคัดกรองนักเรียน', category: 'ระบบดูแล',
    sections: [
      { title: 'ข้อมูลพื้นฐาน', placeholder: 'ชื่อ-สกุล:\nชั้น:' },
      { title: 'ด้านการเรียน', placeholder: 'ผลการเรียน:\nพฤติกรรมในชั้น:' },
      { title: 'ด้านสุขภาพ', placeholder: 'สุขภาพกาย:\nสุขภาพจิต:' },
      { title: 'ด้านเศรษฐกิจ', placeholder: 'รายได้ครอบครัว:\nสถานะ:' },
      { title: 'ผลการคัดกรอง', placeholder: '[ ] กลุ่มปกติ  [ ] กลุ่มเสี่ยง  [ ] กลุ่มมีปัญหา' }
    ]
  },
  { id: 'tpl-08', name: 'แบบ SDQ', category: 'ระบบดูแล',
    sections: [
      { title: 'ข้อมูลนักเรียน', placeholder: 'ชื่อ-สกุล:\nชั้น:' },
      { title: 'ผลคะแนน 5 ด้าน', placeholder: 'ปัญหาอารมณ์:\nปัญหาพฤติกรรม:\nสมาธิสั้น:\nปัญหาเพื่อน:\nสัมพันธภาพทางสังคม:' },
      { title: 'สรุปและข้อเสนอแนะ', placeholder: 'ระบุ...' }
    ]
  },
  { id: 'tpl-09', name: 'แบบรายงาน PA (วPA)', category: 'วิชาชีพ',
    sections: [
      { title: 'ข้อมูลผู้รายงาน', placeholder: 'ชื่อ-สกุล:\nตำแหน่ง:\nวิทยฐานะ:' },
      { title: 'ด้านที่ 1: ด้านการจัดการเรียนรู้', placeholder: 'อธิบายผลงาน...' },
      { title: 'ด้านที่ 2: ด้านผลลัพธ์การเรียนรู้ของผู้เรียน', placeholder: 'แสดงหลักฐาน...' },
      { title: 'Plan', placeholder: 'การวางแผน...' },
      { title: 'Do', placeholder: 'การดำเนินการ...' },
      { title: 'Check', placeholder: 'การตรวจสอบ...' },
      { title: 'Act', placeholder: 'การปรับปรุง...' }
    ]
  },
  { id: 'tpl-10', name: 'รายงาน SAR (Self Assessment Report)', category: 'วิชาชีพ',
    sections: [
      { title: 'บทนำ', placeholder: 'ข้อมูลพื้นฐานของสถานศึกษา...' },
      { title: 'มาตรฐานที่ 1: คุณภาพผู้เรียน', placeholder: 'ผลการดำเนินงาน...' },
      { title: 'มาตรฐานที่ 2: กระบวนการบริหาร', placeholder: 'ผลการดำเนินงาน...' },
      { title: 'มาตรฐานที่ 3: กระบวนการจัดการเรียนรู้', placeholder: 'ผลการดำเนินงาน...' },
      { title: 'จุดเด่น', placeholder: 'ระบุจุดเด่น...' },
      { title: 'จุดที่ควรพัฒนา', placeholder: 'ระบุจุดที่ควรพัฒนา...' },
      { title: 'แนวทางพัฒนา', placeholder: 'แนวทาง...' }
    ]
  },
  { id: 'tpl-11', name: 'บันทึกกิจกรรม PLC', category: 'วิชาชีพ',
    sections: [
      { title: 'ข้อมูลกลุ่ม PLC', placeholder: 'ชื่อกลุ่ม:\nสมาชิก:\nวันที่:' },
      { title: 'ประเด็นที่แลกเปลี่ยน', placeholder: 'หัวข้อ...' },
      { title: 'สรุปผลการแลกเปลี่ยน', placeholder: 'สิ่งที่ได้เรียนรู้...' },
      { title: 'แนวทางนำไปใช้', placeholder: 'สิ่งที่จะนำไปปรับใช้...' }
    ]
  },
  { id: 'tpl-12', name: 'รายงานนวัตกรรม/Best Practice', category: 'วิชาชีพ',
    sections: [
      { title: 'ชื่อนวัตกรรม', placeholder: 'ระบุชื่อ...' },
      { title: 'ความเป็นมา', placeholder: 'สภาพปัญหา...' },
      { title: 'แนวคิด/ทฤษฎี', placeholder: 'หลักการที่ใช้...' },
      { title: 'วิธีการ/ขั้นตอน', placeholder: 'ลำดับขั้นตอน...' },
      { title: 'ผลการดำเนินงาน', placeholder: 'ผลที่ได้...' },
      { title: 'ข้อเสนอแนะ', placeholder: 'สิ่งที่ควรปรับปรุง...' }
    ]
  },
  { id: 'tpl-13', name: 'เกียรติบัตร/ใบรับรอง', category: 'อื่นๆ',
    sections: [
      { title: 'ข้อความเกียรติบัตร', placeholder: 'ขอมอบเกียรติบัตรฉบับนี้ให้แก่...\nเนื่องในโอกาส...' }
    ]
  },
  { id: 'tpl-14', name: 'หนังสือราชการ (ภายใน)', category: 'ราชการ',
    sections: [
      { title: 'ส่วนหัว', placeholder: 'บันทึกข้อความ\nส่วนราชการ:\nที่:\nวันที่:' },
      { title: 'เรื่อง', placeholder: 'ระบุเรื่อง...' },
      { title: 'เรียน', placeholder: 'ระบุผู้รับ...' },
      { title: 'ข้อความ', placeholder: 'ด้วย/เนื่องด้วย...\nจึงเรียนมาเพื่อโปรดทราบ/พิจารณา' },
      { title: 'ลงชื่อ', placeholder: '(ลายมือชื่อ)\nตำแหน่ง' }
    ]
  },
  { id: 'tpl-15', name: 'หนังสือราชการ (ภายนอก)', category: 'ราชการ',
    sections: [
      { title: 'ส่วนหัว', placeholder: 'ที่:\nวันที่:' },
      { title: 'เรื่อง', placeholder: 'ระบุ...' },
      { title: 'เรียน', placeholder: 'ระบุ...' },
      { title: 'สิ่งที่ส่งมาด้วย', placeholder: '(ถ้ามี)' },
      { title: 'ข้อความ', placeholder: 'ด้วย...' },
      { title: 'ลงชื่อ', placeholder: '(ลายมือชื่อ)\nตำแหน่ง' }
    ]
  },
  { id: 'tpl-16', name: 'คำสั่งโรงเรียน', category: 'ราชการ',
    sections: [
      { title: 'ส่วนหัว', placeholder: 'คำสั่งโรงเรียน...\nที่.../...\nเรื่อง...' },
      { title: 'เนื้อหาคำสั่ง', placeholder: 'ด้วย...\nจึงแต่งตั้ง...' },
      { title: 'ลงชื่อ', placeholder: '(ลายมือชื่อ)\nผู้อำนวยการ' }
    ]
  },
  { id: 'tpl-17', name: 'ประกาศโรงเรียน', category: 'ราชการ',
    sections: [
      { title: 'ส่วนหัว', placeholder: 'ประกาศโรงเรียน...\nเรื่อง...' },
      { title: 'เนื้อหา', placeholder: 'ด้วย...' },
      { title: 'ลงชื่อ', placeholder: '(ลายมือชื่อ)\nผู้อำนวยการ' }
    ]
  },
  { id: 'tpl-18', name: 'โครงการ/กิจกรรม', category: 'บริหาร',
    sections: [
      { title: 'ชื่อโครงการ', placeholder: 'ระบุชื่อ...' },
      { title: 'หลักการและเหตุผล', placeholder: 'อธิบาย...' },
      { title: 'วัตถุประสงค์', placeholder: '1.\n2.' },
      { title: 'เป้าหมาย', placeholder: 'เชิงปริมาณ:\nเชิงคุณภาพ:' },
      { title: 'กิจกรรม/ขั้นตอน', placeholder: 'ลำดับกิจกรรม...' },
      { title: 'งบประมาณ', placeholder: 'รายการ:\nรวม:' },
      { title: 'ผู้รับผิดชอบ', placeholder: 'ระบุ...' },
      { title: 'การประเมินผล', placeholder: 'ตัวชี้วัด:\nวิธีการ:' }
    ]
  },
  { id: 'tpl-19', name: 'รายงานผลโครงการ', category: 'บริหาร',
    sections: [
      { title: 'ชื่อโครงการ', placeholder: 'ระบุ...' },
      { title: 'ผลการดำเนินงาน', placeholder: 'รายละเอียด...' },
      { title: 'ผลสำเร็จตามตัวชี้วัด', placeholder: 'ตัวชี้วัด / ผล...' },
      { title: 'ปัญหาและอุปสรรค', placeholder: 'ระบุ...' },
      { title: 'ข้อเสนอแนะ', placeholder: 'ระบุ...' }
    ]
  },
  { id: 'tpl-20', name: 'แบบประเมินตนเอง (SSR)', category: 'บริหาร',
    sections: [
      { title: 'ข้อมูลผู้ประเมิน', placeholder: 'ชื่อ-สกุล:\nตำแหน่ง:' },
      { title: 'ด้านการจัดการเรียนรู้', placeholder: 'ผลงาน/หลักฐาน...' },
      { title: 'ด้านการพัฒนาตนเอง', placeholder: 'การอบรม/ศึกษาดูงาน...' },
      { title: 'ด้านการมีส่วนร่วม', placeholder: 'กิจกรรมที่เข้าร่วม...' }
    ]
  },
  { id: 'tpl-21', name: 'แบบส่งนักเรียนต่อ (Refer)', category: 'ระบบดูแล',
    sections: [
      { title: 'ข้อมูลนักเรียน', placeholder: 'ชื่อ-สกุล:\nชั้น:' },
      { title: 'สาเหตุ/ปัญหา', placeholder: 'ระบุปัญหาที่ต้องส่งต่อ...' },
      { title: 'การดำเนินการเบื้องต้น', placeholder: 'สิ่งที่ครูทำแล้ว...' },
      { title: 'ส่งต่อถึง', placeholder: 'ฝ่ายแนะแนว / หัวหน้าระดับ / ผู้บริหาร' }
    ]
  },
  { id: 'tpl-22', name: 'แบบบันทึกพฤติกรรมนักเรียน', category: 'ระบบดูแล',
    sections: [
      { title: 'ข้อมูลนักเรียน', placeholder: 'ชื่อ-สกุล:\nชั้น:' },
      { title: 'วัน/เวลา/สถานที่', placeholder: 'วันที่:\nเวลา:\nสถานที่:' },
      { title: 'พฤติกรรมที่พบ', placeholder: 'รายละเอียด...' },
      { title: 'การจัดการ', placeholder: 'สิ่งที่ดำเนินการ...' }
    ]
  },
  { id: 'tpl-23', name: 'ใบลา (ครู)', category: 'ราชการ',
    sections: [
      { title: 'ข้อมูล', placeholder: 'ชื่อ-สกุล:\nตำแหน่ง:' },
      { title: 'ประเภทการลา', placeholder: '[ ] ลาป่วย  [ ] ลากิจ  [ ] ลาพักผ่อน' },
      { title: 'ระยะเวลา', placeholder: 'ตั้งแต่:\nถึง:\nรวม: วัน' },
      { title: 'เหตุผล', placeholder: 'ระบุเหตุผล...' }
    ]
  },
  { id: 'tpl-24', name: 'รายงานการประชุม', category: 'บริหาร',
    sections: [
      { title: 'ข้อมูลการประชุม', placeholder: 'ครั้งที่:\nวันที่:\nสถานที่:\nเริ่ม: น.\nสิ้นสุด: น.' },
      { title: 'ผู้เข้าประชุม', placeholder: '1.\n2.\n3.' },
      { title: 'วาระที่ 1: เรื่องแจ้งเพื่อทราบ', placeholder: 'ระบุ...' },
      { title: 'วาระที่ 2: เรื่องพิจารณา', placeholder: 'ระบุ...' },
      { title: 'วาระที่ 3: เรื่องอื่นๆ', placeholder: 'ระบุ...' },
      { title: 'มติ/สรุป', placeholder: 'ที่ประชุมมีมติ...' }
    ]
  },
  { id: 'tpl-25', name: 'แผนพัฒนาตนเอง (ID Plan)', category: 'วิชาชีพ',
    sections: [
      { title: 'ข้อมูลส่วนตัว', placeholder: 'ชื่อ-สกุล:\nตำแหน่ง:' },
      { title: 'สภาพปัจจุบัน', placeholder: 'จุดเด่น:\nจุดที่ควรพัฒนา:' },
      { title: 'เป้าหมาย', placeholder: 'เป้าหมายระยะสั้น:\nเป้าหมายระยะยาว:' },
      { title: 'กิจกรรมพัฒนา', placeholder: '1. อบรม:\n2. ศึกษาดูงาน:\n3. ศึกษาค้นคว้า:' },
      { title: 'ผลที่คาดว่าจะได้รับ', placeholder: 'ระบุ...' }
    ]
  },
  { id: 'tpl-26', name: 'แบบประเมินผลการปฏิบัติงาน', category: 'วิชาชีพ',
    sections: [
      { title: 'ข้อมูลผู้รับการประเมิน', placeholder: 'ชื่อ-สกุล:\nตำแหน่ง:' },
      { title: 'ด้านการจัดการเรียนรู้', placeholder: 'คะแนน: /20' },
      { title: 'ด้านการบริหารจัดการชั้นเรียน', placeholder: 'คะแนน: /20' },
      { title: 'ด้านการพัฒนาผู้เรียน', placeholder: 'คะแนน: /20' },
      { title: 'ด้านการพัฒนาตนเอง', placeholder: 'คะแนน: /20' },
      { title: 'ด้านงานอื่นที่ได้รับมอบหมาย', placeholder: 'คะแนน: /20' },
      { title: 'สรุปผล', placeholder: 'คะแนนรวม: /100\nระดับ:' }
    ]
  },
  { id: 'tpl-27', name: 'แบบบันทึกกิจกรรมชุมนุม', category: 'กิจกรรม',
    sections: [
      { title: 'ชื่อชุมนุม', placeholder: 'ระบุ...' },
      { title: 'ครั้งที่/วันที่', placeholder: 'ครั้งที่:\nวันที่:' },
      { title: 'กิจกรรมที่ทำ', placeholder: 'รายละเอียด...' },
      { title: 'ผลการดำเนินการ', placeholder: 'ระบุ...' },
      { title: 'นักเรียนที่ขาด', placeholder: 'รายชื่อ...' }
    ]
  },
  { id: 'tpl-28', name: 'ปพ.5 (แบบบันทึกผลการเรียน)', category: 'วิชาการ',
    sections: [
      { title: 'ข้อมูลรายวิชา', placeholder: 'รหัสวิชา:\nชื่อวิชา:\nชั้น/ห้อง:\nภาคเรียน:' },
      { title: 'ตารางผลการเรียน', placeholder: '(ใช้ปุ่มส่งออก ปพ.5 ในเมนูผลการเรียน/เกรด)' },
      { title: 'สรุปผล', placeholder: 'จำนวนนักเรียนทั้งหมด:\nผ่าน:\nไม่ผ่าน:' },
      { title: 'ลงชื่อ', placeholder: 'ผู้สอน:\nหัวหน้ากลุ่มสาระ:\nผู้อำนวยการ:' }
    ]
  }
];
