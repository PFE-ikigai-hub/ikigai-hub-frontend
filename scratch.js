const fs = require('fs');
let content = fs.readFileSync('src/core/i18n/I18nProvider.tsx', 'utf-8');

// The corrupted string in account.newPassword that got added
const lines = content.split('\n');
let newLines = [];

for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('account.newPassword') && lines[i].includes('project.history.deliverableCreated')) {
       // it's the corrupted line.
       newLines.push("    'account.newPassword': 'كلمة المرور الجديدة',");
       newLines.push("    'account.confirmPassword': 'تأكيد كلمة المرور',");
       continue; // skip the corrupted line
   }
   // Remove any stray lines that got wrongly injected
   if (lines[i].includes('project.history.deliverableCreated') || 
       lines[i].includes('project.history.versionUploaded') || 
       lines[i].includes('project.history.deliverableStatusChanged') || 
       lines[i].includes('project.history.projectStatusChanged')) {
       // Actually, we don't want to delete the good FR and EN ones!
       // Let's only delete if they are garbled or wrong.
       if (lines[i].includes('Ãƒ') || lines[i].includes('ØªÙ… ØªØºÙŠÙŠØ±')) {
           continue; 
       }
   }
   
   // This handles a rogue piece of text at the end of the corrupted line
   if (lines[i].trim().startsWith('Ãƒ')) {
       continue;
   }
   
   newLines.push(lines[i]);
}

content = newLines.join('\n');

// Re-inject the correct Arabic translation next to versionDownloaded
content = content.replace(/'project\.history\.versionDownloaded': (.*),/g, "'project.history.versionDownloaded': $1,\n    'project.history.deliverableCreated': 'تم إنشاء التسليم',\n    'project.history.versionUploaded': 'تم رفع النسخة',\n    'project.history.deliverableStatusChanged': 'تم تغيير حالة التسليم',\n    'project.history.projectStatusChanged': 'تم تغيير حالة المشروع',");

fs.writeFileSync('src/core/i18n/I18nProvider.tsx', content, 'utf-8');
console.log('Fixed file');
