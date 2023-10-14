import { config } from 'dotenv';
import Express from 'express';
import https from 'https';

import cors from 'cors';

config();

const app = Express();

app.use(Express.json());
app.use(cors());

const apiKey = process.env.OPENAI_API_KEY;

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.post('/api/chat', async (req, res) => {
  try {
    const payload = await req.body;
    const { language, source_code } = payload;

    if (!language) {
      return res.status(422).json({
        message: 'Language is mandatory',
      });
    }
    if (!source_code) {
      return res.status(422).json({
        message: 'Source code is mandatory',
      });
    }

    const instructions =
      'Do an in-depth code review, and improve comments, no additional documentation after or before the code, just rewrite the code precisely.';
    const messages = [
      {
        role: 'system',
        content:
          'You are an experienced software engineer reviewing a random code snippet.',
      },
      { role: 'user', content: `Code snippet is in ${language}.` },
      { role: 'user', content: source_code },
      { role: 'user', content: instructions },
    ];

    const postData = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      stream: true,
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    };

    const request = https.request(options, (response) => {
      // res.setHeader('Content-Type', 'text/plain');
      let count = 0;
      let finalString = '';
      try {
        response.on('data', (chunk) => {
          // convert Buffer to string

          let chunkString = chunk.toString();
          chunkString = chunkString.trim();

          chunkString = chunkString.replace(/data:/g, '');

          if (chunkString.includes('[DONE]')) {
            chunkString = chunkString.replace('[DONE]', '');
          }
          chunkString = chunkString.trim();

          if (chunkString === '') {
            return;
          }

          // console.log('chunkString_' + ++count + ': ');

          let _cnt = 0;
          let chunkStringArray = chunkString.split('\n\n');
          chunkStringArray.forEach((chunkString) => {
            let json = JSON.parse(chunkString);
            let choice = json.choices[0];

            let curString = '';
            if (choice.delta && choice.delta.hasOwnProperty('content')) {
              curString = choice.delta.content;

              res.write(curString);
              finalString += curString;
            }

            // console.log('JSON_' + ++_cnt + ': ' + curString);
          });

          // console.log('\n--------------------------------\n\n');

          // process.exit(0);
        });
      } catch (error) {
        console.error('The error is: ' + error);
      }
      response.on('end', () => {
        console.log('finalString: ' + finalString);
        res.end();
      });
    });

    request.on('error', (error) => {
      console.error(error);
      res.status(500).json({
        message: error.message || 'Something went wrong',
      });
    });

    request.write(postData);
    request.end();
  } catch (error) {
    console.error();
    error;
    res.status(500).json({
      message: error.message || 'Something went wrong',
    });
  }
});

// app.listen(4000, () => {
//   console.log('Server is listening on port 4000');
// });

const server = app.listen(process.env.PORT || 3000);
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
