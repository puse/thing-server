import test from 'ava'

import Router from 'koa-router'

import Request from '@daub/test-router-axios'

import account from '../lib'

const router = new Router()

router.use(account.routes())

router.get(
  '/passthrough',
  account.verify({ passThrough: true }),
  (ctx) => {
    ctx.body = ctx.state.account
  }
)

const request = Request(router)

const { context } = request.app

context.config = {
  jwt: {
    secret: 'hopar'
  }
}

const { User } = context.models

const tokens = { invalid: 'x' }

const bodies = {
  valid: {
    email: 'exo@exo.com',
    password: 'Passw0rd'
  },
  invalidEmail: {
    email: '@exo',
    password: 'Passw0rd'
  },
  invalidPassword: {
    email: 'exo@exo.com',
    password: 'x'
  }
}

const checkErrors = (t, code, ...props) => err => {
  const { status, data } = err.response
  t.is(status, code)
  const { errors } = data || {}
  props.forEach(prop => t.truthy(data[prop]))
}

test.before(Request.loadDb)

test('Register', async t => {
  await t.throws(request.post('/account/register', bodies.invalidEmail))
    .then(checkErrors(t, 422, 'email'))

  await t.notThrows(request.post('/account/register', bodies.valid))

  await t.throws(request.post('/account/register', bodies.valid))
    .then(checkErrors(t, 409, 'email'))
})

test('Login', async t => {
  await t.throws(request.post('/account/login', bodies.invalidEmail))
    .then(checkErrors(t, 401))

  await t.throws(request.post('/account/login', bodies.invalidPassword))
    .then(checkErrors(t, 401))

  tokens.valid = await request.post('/account/login', bodies.valid)
    .then(res => {
      t.is(res.status, 202)

      const { accessToken } = res.data
      t.true(typeof accessToken === 'string')
      return accessToken
    })
})

test('Middleware', async t => {
  await t.throws(request.get('/account'))
    .then(checkErrors(t, 401))

  const headers = {
    'Authorization': `Bearer ${tokens.valid}`
  }

  await request.get('/account', { headers })
    .then(res => {
      t.is(res.status, 200)
      t.truthy(res.data.id)
    })

  await request.get('/passthrough', { headers })
    .then(res => {
      t.is(res.status, 200)
    })
  await request.get('/passthrough')
    .then(res => {
      t.is(res.status, 204)
    })
})
