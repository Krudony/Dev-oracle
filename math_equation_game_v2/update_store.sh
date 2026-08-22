sed -i "s/message: \`Solve for \${generated.targetVariable}!\`/message: \`เป้าหมาย: ทำให้ \${generated.targetVariable} อยู่ตัวเดียวให้ได้!\`/g" src/state/useGameStore.ts
sed -i "s/message: \`Custom puzzle loaded! Isolate '\${parsed.targetVariable}'.\`/message: \`โหลดโจทย์สำเร็จ! เป้าหมายคือหา '\${parsed.targetVariable}'\`/g" src/state/useGameStore.ts
sed -i "s/message: 'Step undone.'/message: 'ย้อนกลับก้าวเมื่อกี้แล้วจ้า'/g" src/state/useGameStore.ts
sed -i "s/message: 'Step redone.'/message: 'ทำซ้ำก้าวตะกี้แล้วจ้า'/g" src/state/useGameStore.ts
sed -i "s/message: 'Equation reset to starting state.'/message: 'รีเซ็ตกลับไปจุดเริ่มต้นแล้ว!'/g" src/state/useGameStore.ts
sed -i "s/message: \`💡 Hint: \${preset.hints\[hintIdx\]}\`/message: \`💡 คำใบ้: \${preset.hints\[hintIdx\]}\`/g" src/state/useGameStore.ts
