#!/bin/bash

# HeaderControls.tsx
sed -i "s/Algebra Unpacker/Galaxy Math Quest/g" src/components/HeaderControls.tsx
sed -i "s/Reverse PEMDAS Mastery/ปอกหัวหอมแก้สมการ/g" src/components/HeaderControls.tsx
sed -i "s/<span>Steps:<\/span>/<span>จำนวนก้าว:<\/span>/g" src/components/HeaderControls.tsx
sed -i "s/pts/แต้ม/g" src/components/HeaderControls.tsx
sed -i "s/<span>Hint<\/span>/<span>ขอคำใบ้<\/span>/g" src/components/HeaderControls.tsx
sed -i "s/<span>Sandbox<\/span>/<span>สร้างโจทย์เอง<\/span>/g" src/components/HeaderControls.tsx
sed -i "s/title=\"Undo step\"/title=\"ย้อนกลับ\"/g" src/components/HeaderControls.tsx
sed -i "s/title=\"Redo step\"/title=\"ทำซ้ำ\"/g" src/components/HeaderControls.tsx
sed -i "s/title=\"Reset puzzle to start\"/title=\"เริ่มใหม่\"/g" src/components/HeaderControls.tsx
sed -i "s/title=\"Get a hint\"/title=\"ขอคำใบ้\"/g" src/components/HeaderControls.tsx
sed -i "s/title=\"Open custom sandbox editor\"/title=\"เปิดโหมดสร้างโจทย์เอง\"/g" src/components/HeaderControls.tsx
sed -i "s/title={isMuted ? 'Unmute audio' : 'Mute audio'}/title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}/g" src/components/HeaderControls.tsx

# MathEquationRenderer.tsx
sed -i "s/No equation loaded. Pick a puzzle to start!/ยังไม่ได้เลือกโจทย์ครับ! จิ้มเลือกด่านด้านบนเลยลุย!/g" src/components/MathEquationRenderer.tsx
sed -i "s/Simplify:/ทำให้น้อยลง:/g" src/components/MathEquationRenderer.tsx

