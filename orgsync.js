#!/usr/bin/env node

// Copyright 2021 Google LLC
// //
// // Licensed under the Apache License, Version 2.0 (the "License");
// // you may not use this file except in compliance with the License.
// // You may obtain a copy of the License at
// //
// //      http://www.apache.org/licenses/LICENSE-2.0
// //
// // Unless required by applicable law or agreed to in writing, software
// // distributed under the License is distributed on an "AS IS" BASIS,
// // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// // See the License for the specific language governing permissions and
// // limitations under the License.

const fs = require("fs-extra");
const axios = require("axios").default;
const path = require("path");
//const FormData = require("form-data");

const { program } = require('commander');

program.version('1.0');

program
  .requiredOption('-o, --org <org>', 'Apigee organization')
  .requiredOption('-t, --token <token>', 'access token .. usually $(gcp auth print-access-token)')
  .option('-e, --env <env>', 'Apigee environment')
  .option('-d, --directory', 'path for apigee exports/imports. Defaults to apigee', 'apigee')
  .option('-v, --verbose', 'turn on more debug info');

program.parse(process.argv);

const opts = program.opts();

const MGMT_URL = 'https://apigee.googleapis.com/v1/organizations';

try {
    run();
} catch (e) {
  console.log(e);
}

// Main run function
async function run() {
  if (opts.debug) console.log("Starting run...");
  await grabOrg();
  await grabDevelopers();
}

// write the json out to a file
async function writeFile( rPath, data ) {
  await fs.ensureDir( path.dirname(rPath) );
  await fs.writeJson( `${rPath}.json`, data, { "spaces": 2 } );
}

// read org info and writ to file
async function grabOrg() {
  let rPath = `${opts.org}`;
  let fPath = `${opts.directory}/${rPath}`;
  let url = `${MGMT_URL}/${rPath}`;

  await fetchResource( url )
    .then( async d => {
      await writeFile( fPath, d.data );
    })
    .catch( e => {
      console.error(e);
    });
}

// read developers
async function grabDevelopers() {
  let rPath = `${opts.org}/developers`;
  let url = `${MGMT_URL}/${rPath}`;

  await fetchResource( url )
    .then( d => {
      d.data.map( async dev => {
        let rPath = `${opts.org}/developers/${dev}`;
        let fPath = `${opts.directory}/${rPath}`;
        let url = `${MGMT_URL}/${rPath}`;
        await fetchResource( url )
          .then( async d => {
            await writeFile( fPath, d.data );
          });
      });
    })
    .catch( e => {
      console.error("our error: ", e);
    });
}

// fetch apigee resource
async function fetchResource(url) {
  const authHeader = `Bearer ${opts.token}`;
  let headers = {};
  headers.Authorization = authHeader;
  return axios
    .get(url, { headers: headers })
    .catch(function (error) {
      console.error("Failed while trying to fetch resource: %s", url);
      console.error("Error: ", error);
    });
}
