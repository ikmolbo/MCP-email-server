/**
 * Test pentru funcționalitatea de codificare a subiectelor de e-mail
 */

import { encodeEmailSubject } from '../build/utils.js';
import assert from 'assert';

// Testează subiecte ASCII simple
function testSimpleAsciiSubjects() {
  const asciiSubjects = [
    'Hello World',
    'Meeting tomorrow',
    'Status update for project XYZ',
    'Simple ASCII subject with numbers 123 and symbols !@#$%'
  ];

  for (const subject of asciiSubjects) {
    const encoded = encodeEmailSubject(subject);
    assert.strictEqual(encoded, subject, `Subiectele ASCII simple nu trebuie codificate: ${subject}`);
    console.log(`✓ Subiect ASCII corect: "${subject}" -> "${encoded}"`);
  }
}

// Testează subiecte cu caractere non-ASCII
function testNonAsciiSubjects() {
  const testCases = [
    { input: 'Montréal, QC', expected: true },
    { input: 'München', expected: true },
    { input: 'こんにちは', expected: true },  // Japoneza
    { input: 'Привет, мир!', expected: true },  // Rusa
    { input: 'नमस्ते दुनिया', expected: true },  // Hindi
    { input: 'Meeting in Montréal', expected: true },
    { input: 'Email with emoji 🚀', expected: true },
  ];

  for (const { input, expected } of testCases) {
    const encoded = encodeEmailSubject(input);
    const isEncoded = encoded.startsWith('=?UTF-8?B?');
    assert.strictEqual(isEncoded, expected, `Codificarea nu este corectă pentru: ${input}`);
    
    // Verificare suplimentară: decodifică și compară cu originalul
    if (isEncoded) {
      const base64Part = encoded.replace('=?UTF-8?B?', '').replace('?=', '');
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      assert.strictEqual(decoded, input, `Decodificarea nu produce textul original: ${input}`);
      console.log(`✓ Subiect non-ASCII codificat corect: "${input}" -> "${encoded}"`);
    }
  }
}

// Rulează testele
function runTests() {
  console.log('Pornire teste de codificare a subiectelor e-mail...\n');
  
  try {
    testSimpleAsciiSubjects();
    console.log('\nTeste de subiecte ASCII simple: TRECUTE ✓\n');
    
    testNonAsciiSubjects();
    console.log('\nTeste de subiecte non-ASCII: TRECUTE ✓\n');
    
    console.log('Toate testele au trecut cu succes! ✅');
  } catch (error) {
    console.error('\n❌ EROARE ÎN TESTE:', error.message);
    process.exit(1);
  }
}

runTests(); 