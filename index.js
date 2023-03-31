import http from 'http'
import dotenv from 'dotenv'
import { Verifier } from '@ucanto/principal'
import * as Signer from '@ucanto/principal/ed25519'
import { importDAG } from '@ucanto/core/delegation'
import { CarReader } from '@ipld/car'
import { delegationToString } from '@web3-storage/access/encoding'
import { StoreConf } from '@web3-storage/access/stores/store-conf'
import * as Client from '@web3-storage/w3up-client'

dotenv.config()

async function main () {
  // Load client with specific private key
  const principal = Signer.parse(mustGetEnv('KEY'))
  const client = await Client.create({ principal, store: new StoreConf({ profile: 'doodle-comp-server' }) })

  // Add proof that this agent has been delegated capabilities on the space
  const proof = await parseProof(mustGetEnv('PROOF'))
  const space = await client.addSpace(proof)
  await client.setCurrentSpace(space.did())

  console.log('Agent DID:', client.agent().did())
  console.log('Space DID:', space.did())

  const port = process.env.PORT ?? 3003
  http.createServer(async (request, response) => {
    addCORSHeaders(request, response)
    if (request.method === 'OPTIONS') {
      return response.end()
    }

    try {
      const data = await new Promise((resolve, reject) => {
        let body = ''
        request
          .on('data', chunk => { body += chunk })
          .on('error', reject)
          .on('end', () => resolve(body))
      })
      const { audience } = JSON.parse(data)
      const proof = await client.createDelegation(
        Verifier.parse(audience),
        ['upload/add', 'upload/list'],
        { expiration: Infinity }
      )
      response.writeHead(200)
      response.end(delegationToString(proof))
    } catch (err) {
      console.error(err)
      response.writeHead(500)
      response.end()
    }
  })
  .listen(port, () => console.log(`Server listening on :${port}`))
}

/** @param {string} key */
function mustGetEnv (key) {
  const value = process.env[key]
  if (!value) throw new Error(`missing environment variable: ${key}`)
  return value
}

function addCORSHeaders (request, response) {
  const origin = request.headers['origin']
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  } else {
    response.setHeader('Access-Control-Allow-Origin', '*')
  }
  response.setHeader('Access-Control-Allow-Methods', 'POST')
}

/** @param {string} data Base64 encoded CAR file */
async function parseProof (data) {
  const blocks = []
  const reader = await CarReader.fromBytes(Buffer.from(data, 'base64'))
  for await (const block of reader.blocks()) {
    blocks.push(block)
  }
  // @ts-ignore
  return importDAG(blocks)
}

main()
