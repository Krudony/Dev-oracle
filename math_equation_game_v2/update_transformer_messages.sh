sed -i "s/🎉 Amazing! You successfully isolated/🎉 เยี่ยมมาก! เธอแยก/g" src/engine/transformer.ts
sed -i "s/Awesome! Moved \${termText} using opposite operation '\${opSymbol}'./เก่งมาก! ย้าย \${termText} ไปอีกฝั่งด้วยเครื่องหมาย '\${opSymbol}' (หลักการตราชั่ง: ทำอะไรฝั่งนึง ต้องทำเหมือนกันอีกฝั่ง!)/g" src/engine/transformer.ts
sed -i "s/Incorrect inverse operation! The opposite operation is \${opNames\[targetPeel.requiredInverseOp\]}./เลือกเครื่องหมายผิดจ้า! เครื่องหมายที่ตรงข้ามคือ \${opNames\[targetPeel.requiredInverseOp\]} นะ/g" src/engine/transformer.ts
sed -i "s/addition (+)/การบวก (+)/g" src/engine/transformer.ts
sed -i "s/subtraction (-)/การลบ (-)/g" src/engine/transformer.ts
sed -i "s/multiplication (×)/การคูณ (×)/g" src/engine/transformer.ts
sed -i "s/division (÷)/การหาร (÷)/g" src/engine/transformer.ts
sed -i "s/Invalid move! This term cannot be peeled yet./ย้ายไม่ได้จ้า! ตัวเลขนี้ยังปอกออกไม่ได้นะ/g" src/engine/transformer.ts
