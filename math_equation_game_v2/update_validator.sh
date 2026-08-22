sed -i "s/Selected term is not on the left side of the equation./ตัวเลขนี้ไม่ได้อยู่ฝั่งเดียวกับตัวแปรนะ!/g" src/engine/validator.ts
sed -i 's/You clicked.*/หนูกดโดนตัวแปรนี้นะ! เป้าหมายของเราคือทำให้มันอยู่ตัวเดียว ดังนั้นต้องย้ายตัวเลขอื่นออกไปจ้า`/g' src/engine/validator.ts
sed -i "s/This term cannot be moved right now./ตัวเลขนี้ยังย้ายไม่ได้ตอนนี้จ้า!/g" src/engine/validator.ts
sed -i "s/square \[ \]/ก้ามปู \[ \]/g" src/engine/validator.ts
sed -i "s/curly { }/ปีกกา { }/g" src/engine/validator.ts
sed -i "s/round ( )/วงเล็บโค้ง ( )/g" src/engine/validator.ts
sed -i "s/Trapped inside \${bracketName} brackets/โดนขังอยู่ใน\${bracketName}/g" src/engine/validator.ts
sed -i 's/This term is trapped inside the ${bracketName} brackets! Clear the outer numbers first before unpacking inside./ตัวเลขนี้โดนขังอยู่ใน${bracketName}! ต้องเคลียร์ตัวเลขรอบนอกสุดก่อน ถึงจะเข้าไปข้างในได้นะ/g' src/engine/validator.ts
sed -i "s/Fraction denominator: \${denText}/ติดตัวส่วน: \${denText}/g" src/engine/validator.ts
sed -i 's/This term is trapped in the numerator! You must clear the bottom denominator (${denText}) first./ตัวเลขนี้ติดอยู่ชั้นบนของเศษส่วน! ต้องย้ายตัวส่วน (${denText}) ที่อยู่ข้างล่างไปก่อนนะ/g' src/engine/validator.ts
sed -i "s/Outer multiplier: \${coeffText}/ติดตัวคูณข้างนอก: \${coeffText}/g" src/engine/validator.ts
sed -i 's/Clear the outer multiplier (${coeffText}) in front of the expression first!/ต้องเคลียร์ตัวคูณ (${coeffText}) ที่อยู่ข้างนอกสุดก่อนจ้า!/g' src/engine/validator.ts
sed -i "s/Outer addition\/subtraction: \${termText}/ติดบวกลบข้างนอก: \${termText}/g" src/engine/validator.ts
sed -i 's/You must peel away the outer addition\/subtraction (${termText}) before opening this layer!/ต้องปอกตัวที่บวกลบกันอยู่ข้างนอก (${termText}) ออกไปก่อนนะ!/g' src/engine/validator.ts
sed -i "s/This term is locked! Follow Reverse PEMDAS to peel outer terms first./ตัวนี้ยังโดนล็อคอยู่! ต้องปอกหัวหอมจากข้างนอกสุดเข้าไปข้างในนะจ๊ะ/g" src/engine/validator.ts
