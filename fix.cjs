const fs = require('fs');
let text = fs.readFileSync('components/BankReconciliationModal.tsx', 'utf8');

text = text.replace(/const trnTypeMatch = \/<TRNTYPE>\(\.\*\?\)\(\?:\n<\)\/i\.exec\(block\);/g, "const trnTypeMatch = /<TRNTYPE>(.*?)(?:\\\\r?\\\\n|<)/i.exec(block);");
text = text.replace(/const memoMatch = \/<MEMO>\(\.\*\?\)\(\?:\n<\)\/i\.exec\(block\);/g, "const memoMatch = /<MEMO>(.*?)(?:\\\\r?\\\\n|<)/i.exec(block);");
text = text.replace(/const nameMatch = \/<NAME>\(\.\*\?\)\(\?:\n<\)\/i\.exec\(block\);/g, "const nameMatch = /<NAME>(.*?)(?:\\\\r?\\\\n|<)/i.exec(block);");
text = text.replace(/const lines = text\.split\(\/\n\/\);/g, "const lines = text.split(/\\\\r?\\\\n/);");

fs.writeFileSync('components/BankReconciliationModal.tsx', text);
