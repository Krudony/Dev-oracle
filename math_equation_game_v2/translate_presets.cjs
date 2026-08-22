const fs = require('fs');
let content = fs.readFileSync('src/generator/presets.ts', 'utf8');

// Replace descriptions and hints with Thai translations
const translations = {
  "Solve for x. Peel the +5 first!": "หาค่า x ให้ได้ ลองปอก +5 ออกไปก่อนนะ!",
  "Isolate x. What is the opposite of -7?": "ทำให้ x อยู่ตัวเดียว อะไรคือเครื่องหมายตรงข้ามของ -7 เอ่ย?",
  "Clear the multiplier by dividing.": "เคลียร์ตัวคูณด้วยการหารนะจ๊ะ",
  "Multiply both sides by 2 to clear the fraction.": "คูณ 2 ทั้งสองฝั่งเพื่อเคลียร์ตัวส่วน",
  "Remove the constant outside the bracket first.": "ย้ายตัวเลขที่อยู่นอกวงเล็บก่อนนะ",
  "Then distribute or divide the outer multiplier.": "จากนั้นค่อยย้ายตัวคูณที่อยู่ข้างนอก",
  "Clear the fraction denominator first.": "ต้องย้ายตัวส่วนข้างล่างไปก่อนนะ",
  "Then solve the numerator like a normal equation.": "แล้วค่อยแก้ตัวเศษเหมือนสมการปกติเลย",
  "Start from the outermost round brackets ( ).": "เริ่มจากย้ายตัวที่อยู่นอกวงเล็บโค้ง ( ) กว้างสุดนะ",
  "Work your way into the square brackets [ ].": "ค่อยๆ เจาะเข้าไปในวงเล็บก้ามปู [ ]",
  "Unpack the layers step-by-step.": "ค่อยๆ ปอกหัวหอมทีละชั้น!",
  "Multiply by the bottom to free the top.": "คูณตัวส่วนข้างล่างเพื่อปลดล็อกตัวบน",
  "Divide by the outer multiplier.": "หารด้วยตัวคูณที่อยู่ข้างนอก",
  "Move the outer constant first.": "ย้ายตัวเลขที่บวก/ลบอยู่ข้างนอกก่อนนะ",
  "Clear the curly braces { } last.": "วงเล็บปีกกา { } เอาไว้ท้ายสุดเลย",
  "Clear the square brackets [ ] next.": "ต่อไปเคลียร์วงเล็บก้ามปู [ ] นะ",
  "Finally, solve the inner equation.": "สุดท้าย แก้สมการข้างในสุดเลย!",
  "Simple addition": "การบวกแบบง่ายๆ",
  "Simple subtraction": "การลบแบบชิลๆ",
  "Simple multiplication": "การคูณแบบกล้วยๆ",
  "Simple division": "การหารแบบจิ๊บๆ",
  "Two-step equation": "สมการสองสเต็ป",
  "Fractions level 1": "เศษส่วนด่าน 1",
  "Nested brackets level 1": "วงเล็บซ้อนวงเล็บด่าน 1",
  "Complex nested fractions": "เศษส่วนซ้อนวงเล็บสุดโหด",
  "The Triple Onion": "หัวหอมสามชั้น!",
  "The Final Boss": "บอสใหญ่!"
};

for (const [eng, thai] of Object.entries(translations)) {
  content = content.replaceAll(eng, thai);
}

fs.writeFileSync('src/generator/presets.ts', content);
