const fs = require('fs');
const files = ['script.js', 'server.js', 'anniversaire.js', 'declaration.js', 'distance.js', 'index.html', 'style.css', 'pardon.js'];
const map = {
  'Ã©': 'é', 'Ã¨': 'è', 'Ã¢': 'â', 'Ã®': 'î', 'Ã§': 'ç', 'Å“': 'œ', 
  'Ã€': 'À', 'ðŸ’Œ': '💌', 'ðŸ“–': '📖', 'ðŸ‘ ï¸ ': '👁️', 'ðŸ”“': '🔓', 
  'â ¤ï¸ ': '❤️', 'ðŸš€': '🚀', 'Ã ': 'à', 'Ãª': 'ê', 'Ã´': 'ô', 
  'Ã»': 'û', 'Ã¹': 'ù', 'Ã¯': 'ï'
};
files.forEach(f => {
  try {
    if (!fs.existsSync(f)) return;
    let txt = fs.readFileSync(f, 'utf8');
    for(let k in map) {
      txt = txt.split(k).join(map[k]);
    }
    // Specially handle non-breaking space mapping bug
    txt = txt.replace(/Ã\xA0/g, 'à');
    fs.writeFileSync(f, txt, 'utf8');
  } catch(e){ console.error(e) }
});
