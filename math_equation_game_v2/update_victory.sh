sed -i "s/Puzzle Solved! 🎉/แก้โจทย์สำเร็จ! 🎉/g" src/components/VictoryModal.tsx
sed -i "s/You successfully peeled every layer to isolate/หนูปอกหัวหอมทุกชั้นจนแยก/g" src/components/VictoryModal.tsx
sed -i "s/<strong>{equation.targetVariable}<\/strong>!/<strong>{equation.targetVariable}<\/strong> ได้สำเร็จ!/g" src/components/VictoryModal.tsx
sed -i "s/Steps Taken/จำนวนก้าวที่ใช้/g" src/components/VictoryModal.tsx
sed -i "s/Rating/ระดับฝีมือ/g" src/components/VictoryModal.tsx
sed -i "s/'Master Peeler!'/'เซียนปอกหัวหอม!'/g" src/components/VictoryModal.tsx
sed -i "s/'Great Job!'/'เก่งมาก!'/g" src/components/VictoryModal.tsx
sed -i "s/'Solved!'/'ผ่านแล้ว!'/g" src/components/VictoryModal.tsx
sed -i "s/<span>Replay<\/span>/<span>เล่นอีกรอบ<\/span>/g" src/components/VictoryModal.tsx
sed -i "s/<span>Next<\/span>/<span>ด่านต่อไป<\/span>/g" src/components/VictoryModal.tsx
