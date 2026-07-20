import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

addEventListener('fetch', event => {
  event.respondWith(handleEvent(event))
})

async function handleEvent(event) {
  try {
    return await getAssetFromKV(event)
  } catch (e) {
    try {
      let notFoundResponse = await getAssetFromKV(event, {
        mapRequestToAsset: req => new URL(`${new URL(req.url).origin}/404.html`, req),
      })
      return new Response(notFoundResponse.body, {
        ...notFoundResponse,
        status: 404,
      })
    } catch (e) {
      return new Response('Not Found', { status: 404 })
    }
  }
}
