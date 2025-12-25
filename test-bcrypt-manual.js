
const bcrypt = require('bcrypt');

async function test() {
    const hash = '$2b$10$uj.4sYznmtoEDFQ.hwqdnuesr/Uhuco759K9vsMnWTIGE5rr5P5.i';
    const pass = '123456';

    console.log(`Testing hash: ${hash}`);
    console.log(`Testing pass: ${pass}`);


    // Hypothesis 1: Whitespace
    console.log('Testing "123456 " (trailing space):', await bcrypt.compare('123456 ', hash));

    // Hypothesis 2: Double Hashing (bcrypt(bcrypt("123456")))
    // We can't easily reproduce the inner salt, but we can verify if the current hash 
    // is a valid bcrypt hash of a STRING that looks like a bcrypt hash.
    // If the user registered, they got a hash. If that hash was hashed again...
    // The stored hash corresponds to SOME plaintext. 
    // If that plaintext starts with "$2b$...", then it was double hashed.

    // Let's try to see if we can just re-register or fix the code. 
    // But establishing the cause is helpful.

    // Hypothesis 3: Frontend sent the hash? 
    // If frontend sent "$2b$10$..." as the password, and backend hashed it again.
    // Then bcrypt.compare( "$2b$10$...", storedHash ) should be true.
    // But we don't know the specific inner hash sent.

    // Let's just tell the user the hash is mathematically incorrect for "123456".
    // It is possible the user manually inserted this hash into the DB?
    // Or maybe they used an online generator that produced a slightly different format (e.g. $2y$ vs $2b$)?
    // The prefix is $2b$, which is standard.
}

test();
