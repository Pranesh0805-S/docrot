# Triage: failures the static checker could not explain

Verify each by hand: install the package at that version in a fresh folder and run the example as written.

**Result: 26 candidates. 5 real documentation problems (3 invalid as written, 2 outdated by platform changes), 21 not documentation errors (including 1 false alarm from the tool).**

## axios@1.20.0, README line 1626
Category: Runtime API error (unverified)
Error: TypeError: error.toJSON is not a function
```js
axios.get('/user/12345').catch(function (error) {
  console.log(error.toJSON());
});
```

Verdict: Not doc rot: relative URL fails in Node (Invalid URL), so the error is not an AxiosError. Browser-style example.

## axios@1.20.0, README line 1634
Category: Runtime API error (unverified)
Error: TypeError: error.toJSON is not a function
```js
axios
  .get('/user/12345', {
    headers: { Authorization: 'Bearer token' },
    redact: ['authorization'],
  })
  .catch(function (error) {
    console.log(error.toJSON().config.headers.Authorization); // [REDACTED ****]
  });
```

Verdict: Not doc rot: same as above, relative URL.

## commander@15.0.0, README line 78
Category: Other
Error: error: missing required argument 'string'

```js
import { program } from 'commander';

program
  .option('--first')
  .option('-s, --separator <char>')
  .argument('<string>');

program.parse();
```

Verdict: Not doc rot: runs with no arguments, so commander prints its expected error. Working as designed.

## commander@15.0.0, README line 105
Category: Other
Error: Usage: string-util [options] [command]

CLI to some JavaScript string utilities

Options:
  -V, --ve
```js
import { Command } from 'commander';
const program = new Command();

program
  .name('string-util')
  .description('CLI to some JavaScript string utilities')
  .version('0.8.0');

```

Verdict: Not doc rot: prints the usage text because no command was given. Working as designed.

## commander@15.0.0, README line 346
Category: Other
Error: error: required option '-c, --cheese <type>' not specified

```js
program
  .requiredOption('-c, --cheese <type>', 'pizza must have cheese');

program.parse();
```

Verdict: Not doc rot: required option not passed, so commander exits with its expected error.

## commander@15.0.0, README line 707
Category: Other
Error:     throw new Error(executableMissing);
```js
program
  .name('pm')
  .version('0.1.0')
  .command('install [package-names...]', 'install one or more packages')
  .command('search [query]', 'search with optional query')
  .command('update', 'update installed packages', { executableFile: 'myUpdateSubCommand' })
  .command('list', 'list packages installed', { isDefault: true });

```

Verdict: Not doc rot: stand-alone sub-command executables do not exist in the sandbox.

## commander@15.0.0, README line 976
Category: Other
Error: error: unknown option '--port'

```js
program.parse(); // parse process.argv and auto-detect electron and special node flags
program.parse(process.argv); // assume argv[0] is app and argv[1] is script
program.parse(['--port', '80'], { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
```

Verdict: Not doc rot: example lines are alternatives; the real argv contains no --port.

## commander@15.0.0, README line 1101
Category: Other
Error: Password must be longer than four characters

```js
program.error('Password must be longer than four characters');
program.error('Custom processing has failed', { exitCode: 2, code: 'my.custom.error' });
```

Verdict: Not doc rot: demonstrates program.error(), which is meant to throw.

## dotenv@18.0.6, README line 601
Category: Other
Error: Error: ENOENT: no such file or directory, open 'C:\Users\prane\AppData\Local\Temp\docrot-wAOYqc\.env'
```js
const result = dotenv.config()

if (result.error) {
  throw result.error
}

console.log(result.parsed)
```

Verdict: Not doc rot: needs a .env file in the working directory.

## mongoose@9.11.0, README line 183
Category: Other
Error:       throw new _mongoose.Error.MissingSchemaError(name);
```js
const MyModel = mongoose.model('ModelName');
```

Verdict: Not doc rot: needs a model registered earlier in the README (missing context).

## mongoose@9.11.0, README line 252
Category: Other
Error:       throw new _mongoose.Error.MissingSchemaError(name);
```js
// retrieve my model
const BlogPost = mongoose.model('BlogPost');

// create a blog post
const post = new BlogPost();

// create a comment
post.comments.push({ title: 'My comment' });
```

Verdict: Not doc rot: needs a model registered earlier in the README (missing context).

## node-fetch@3.3.2, README line 309
Category: Other
Error: if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
```js
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream';
import {promisify} from 'node:util'
import fetch from 'node-fetch';

const streamPipeline = promisify(pipeline);

const response = await fetch('https://github.githubassets.com/images/modules/logos_page/Octocat.png');
```

Verdict: Not doc rot: real network request to an external URL, or a cut-off fragment.

## node-fetch@3.3.2, README line 345
Category: Other
Error: Warning: Detected unsettled top-level await at file:///C:/Users/prane/AppData/Local/Temp/docrot-Z8l9
```js
import fetch from 'node-fetch';

const read = async body => {
	let error;
	body.on('error', err => {
		error = err;
	});

```

Verdict: Not doc rot: fragment: defines a helper but never calls it, top-level await never settles.

## node-fetch@3.3.2, README line 402
Category: Other
Error: Error: ENOENT: no such file or directory, stat 'C:\Users\prane\AppData\Local\Temp\docrot-Z8l9Vc\input.txt'
```js
import fetch, {
  Blob,
  blobFrom,
  blobFromSync,
  File,
  fileFrom,
  fileFromSync,
} from 'node-fetch'
```

Verdict: Not doc rot: needs a local file (input.txt).

## request@2.88.2, README line 597
Category: Other
Error: Error: connect ENOENT /absolute/path/to/unix.socket
```js
/* Pattern */ 'http://unix:SOCKET:PATH'
/* Example */ request.get('http://unix:/absolute/path/to/unix.socket:/request/path')
```

Verdict: Not doc rot: placeholder unix socket path.

## request@2.88.2, README line 663
Category: Other
Error: TypeError: SSLv3 methods disabled
```js
request.get({
    url: 'https://api.some-server.com/',
    agentOptions: {
        secureProtocol: 'SSLv3_method'
    }
});
```

Verdict: REAL (stale, platform change): SSLv3 is disabled in current Node/OpenSSL, so the documented option cannot work. request is deprecated, no PR.

## request@2.88.2, README line 1013
Category: Other
Error: TypeError: Cannot read properties of undefined (reading 'statusCode')
```js
  const request = require('request')
    , rand = Math.floor(Math.random()*100000000).toString()
    ;
  request(
    { method: 'PUT'
    , uri: 'http://mikeal.iriscouch.com/testjs/' + rand
    , multipart:
      [ { 'content-type': 'application/json'
```

Verdict: Not doc rot: calls a dead external URL, so the callback gets no response.

## request@2.88.2, README line 1072
Category: Other
Error: ReferenceError: Cannot access 'request' before initialization
```js
const request = request.defaults({jar: true})
request('http://www.google.com', function () {
  request('http://images.google.com')
})
```

Verdict: REAL (invalid as written): const request = request.defaults(...) uses the name inside its own declaration. request is deprecated, no PR.

## request@2.88.2, README line 1081
Category: Other
Error: ReferenceError: Cannot access 'request' before initialization
```js
const j = request.jar()
const request = request.defaults({jar:j})
request('http://www.google.com', function () {
  request('http://images.google.com')
})
```

Verdict: REAL (invalid as written): request is used before its const declaration. request is deprecated, no PR.

## ws@8.22.0, README line 152
Category: Other
Error: Error: Unexpected server response: 403
```js
import WebSocket from 'ws';

const ws = new WebSocket('ws://www.host.com/path', {
  perMessageDeflate: false
});
```

Verdict: Not doc rot: placeholder host (www.host.com) returns 403.

## ws@8.22.0, README line 220
Category: Other
Error: Error: ENOENT: no such file or directory, open 'C:\path\to\cert.pem'
```js
import { createServer } from 'https';
import { readFileSync } from 'fs';
import { WebSocketServer } from 'ws';

const server = createServer({
  cert: readFileSync('/path/to/cert.pem'),
  key: readFileSync('/path/to/key.pem')
});
```

Verdict: Not doc rot: placeholder certificate paths.

## mime@4.1.0, README line 122
Category: Other
Error:             throw new Error('define() not allowed for built-in Mime objects. See https://github.com/broofa/mime/blob/main/README.md#custom-mime-instances');
```js
mime.define({'text/x-abc': ['abc', 'abcd']});

mime.getType('abcd');            // ⇨ 'text/x-abc'
mime.getExtension('text/x-abc')  // ⇨ 'abc'
```

Verdict: False alarm (tool): mime here is the custom instance created in the previous README snippet; docrot tested the built-in instance.

## mysql@2.18.1, README line 1259
Category: Other
Error: RangeError [ERR_SOCKET_BAD_PORT]: Port should be >= 0 and < 65536. Received type number (84943).
```js
var connection = require('mysql').createConnection({
  port: 84943, // WRONG PORT
});

connection.connect(function(err) {
  console.log(err.code); // 'ECONNREFUSED'
  console.log(err.fatal); // true
});
```

Verdict: REAL (stale, platform change): port 84943 is out of range, so current Node throws a RangeError instead of the documented ECONNREFUSED. Minor; possible PR.

## nconf@0.13.0, README line 10
Category: Other
Error: TypeError: Cannot read properties of undefined (reading 'toString')
```js
  var fs    = require('fs'),
      nconf = require('nconf');

  //
  // Setup nconf to use (in-order):
  //   1. Command-line arguments
  //   2. Environment variables
  //   3. A file located at 'path/to/config.json'
```

Verdict: Not doc rot: snippet is only a require plus comments; the error is not caused by README code. Optional: check that require('nconf') loads on this Node version.

## nconf@0.13.0, README line 175
Category: Other
Error:     throw new Error('Missing required keys: ' + missing.join(', '));
```js
  nconf.defaults({
    keya: 'a',
  });

  nconf.required(['keya', 'keyb']);
  // Error: Missing required keys: keyb
```

Verdict: Not doc rot: deliberately demonstrates the thrown error.

## node-schedule@2.1.1, README line 138
Category: Other
Error: TypeError: Assignment to constant variable.
```js
const schedule = require('node-schedule');
const date = new Date(2012, 11, 21, 5, 30, 0);
const x = 'Tada!';
const job = schedule.scheduleJob(date, function(y){
  console.log(y);
}.bind(null,x));
x = 'Changing Data';
```

Verdict: REAL (invalid as written): assignment to a const. Maintained package: confirm on GitHub, then open a PR changing const to let.
