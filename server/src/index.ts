import { Hono } from 'hono'

interface Env {
  OPEN_ELECTRICITY_API_TOKEN: string
}

const app = new Hono<{ Bindings: Env }>()

app.get('/api/message', async (c) => {
  /* send a request below to openelectricity.org.au to retrieve facilities */

  // const res = await fetch("https://api.openelectricity.org.au/v4/facilities", {
  //     headers: {
  //         Authorization: `Bearer ${c.env.OPEN_ELECTRICITY_API_TOKEN}`
  //     }
  // });

  return c.json({
    message: '✅ Hello world.',
  })
})

export default app
