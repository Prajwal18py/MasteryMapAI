// Pure editing operations, shared by the editor and regression tests.
export function editPython(code, start, end, key, shift = false) {
  const lineStart = code.lastIndexOf('\n', start - 1) + 1;
  if (key === 'Enter') {
    const before = code.slice(lineStart, start);
    const indent = before.match(/^[ \t]*/)[0].replace(/\t/g, '    ');
    const content = before.replace(/#.*$/, '').trimEnd();
    const insert = '\n' + indent + (content.endsWith(':') ? '    ' : '');
    return {code:code.slice(0,start)+insert+code.slice(end),start:start+insert.length,end:start+insert.length};
  }
  if (key === 'Tab') {
    if (start === end && !shift) {
      const insert = ' '.repeat(4 - ((start-lineStart)%4));
      return {code:code.slice(0,start)+insert+code.slice(end),start:start+insert.length,end:start+insert.length};
    }
    const stop = end > start && code[end-1] === '\n' ? end-1 : end;
    const lineEnd = code.indexOf('\n', stop);
    const last = lineEnd < 0 ? code.length : lineEnd;
    const lines = code.slice(lineStart,last).split('\n');
    let total=0,first=0;
    const changed=lines.map((line,i)=>{
      const n=shift ? -(line.startsWith('\t')?1:Math.min(4,line.match(/^ */)[0].length)) : 4;
      total+=n;if(i===0)first=n;
      return shift?line.slice(-n):'    '+line;
    }).join('\n');
    return {code:code.slice(0,lineStart)+changed+code.slice(last),start:Math.max(lineStart,start+first),end:Math.max(lineStart,end+total)};
  }
  if (key === 'Backspace' && start===end && start>lineStart && /^ +$/.test(code.slice(lineStart,start))) {
    const count=(start-lineStart)%4||4;
    return {code:code.slice(0,start-count)+code.slice(end),start:start-count,end:start-count};
  }
  return null;
}
