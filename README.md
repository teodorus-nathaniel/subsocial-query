# Subsocial Query

Subsocial query is a typescript library that contains helpers for [subsocial-sdk](https://docs.subsocial.network/docs/develop/) integration with [react-query](https://tanstack.com/query/v4/docs/overview). Data caching are all managed by react-query.

This library also includes [pool-query](https://github.com/teodorus-nathaniel/pool-query) to batch api calls.

# Example Project

[Example Vite project](https://github.com/teodorus-nathaniel/subsocial-query-example) that uses subsocial query. The project showcases every concepts that are explained under `Usage` heading

# Usage

## Subsocial Connection Config

```tsx
import { setSubsocialConfig } from 'subsocial-query1'
// You can override presets of IPFS/Substrate Node URL by passing the second parameter.
// Use staging config, ipfs crust are already configured with testnet api key
setSubsocialConfig('staging')
// Use production config.
setSubsocialConfig('prod', {
  postConnectConfig: (api) => {
    const mnemonic = '' // CRUST MNEMONIC
    const authHeader = generateCrustAuthToken(mnemonic)
    api.ipfs.setWriteHeaders({
      authorization: 'Basic ' + authHeader,
    })
  },
})
```

## useSubsocialQuery

#### Basic Usage

Below is the most basic usage of using `subsocial-query` to manage queries.

`subsocial-query` manages the connection and creation of the API,
and whilst the api is connecting, `useGetPost` `isLoading` attribute will be `true`

```typescript
// queries.ts
import { QueryConfig, useSubsocialQuery } from 'subsocial-query'
type GetPostData = { postId: string }

const getPost = async ({ api, data }: SubsocialParam<GetPostData>) => {
  return api.findPost({ id: data.postId })
}

export const getPostKey = 'getPost'
export function useGetPost(data: GetPostData, config?: QueryConfig) {
  const defaultConfig = {
    // react-query configs...
  }
  return useSubsocialQuery(
    { data, key: getPostKey },
    getPost,
    config,
    defaultConfig
  )
}
```

#### Pooled API Calls

To better manage each queries' cache, for example each post and space in its own cache without increasing the number of API calls, its recommended to use `poolQuery` to pool all calls within certain interval and make 1 API call to batch all of the data needed.

```typescript
// queries.ts
import { QueryConfig, useSubsocialQuery, poolQuery } from 'subsocial-query'
type GetPostData = { postId: string }

// This is the only change made from the above code.
// With these, calls made within 250ms (default poolQuery, can be configured), are pooled together.
// If there are more than 1 call, then it will invoke multiCall function and redistribute it based on the resultMapper (if not provided, use array indexes)
// singleCall can also be omitted.
export const getPost = poolQuery({
  singleCall: async ({ api, data }: SubsocialParam<GetPostData>) => {
    console.log('Subsocial Service: getPost: singleCall')
    return api.findPost({ id: data.postId })
  },
  multiCall: async (allParams) => {
    console.log('Subsocial Service: getPost: multiCall')
    const [{ api }] = allParams
    const postIds = allParams.map(({ data: { postId } }) => postId)
    const res = await api.findPublicPosts(postIds)
    return res
  },
  resultMapper: {
    paramToKey: (param) => param.data.postId,
    resultToKey: (result) => result?.id ?? '',
  },
})

export const getPostKey = 'getPost'
export function useGetPost(data: GetPostData, config?: QueryConfig) {
  return useSubsocialQuery({ data, key: getPostKey }, getPost, config)
}
```

Because all same queries are pooled together, you can use `useGetPost` like below:

```tsx
// Post.tsx
export default function Post ({ id }: { id: string }) {
  const { post } = useGetPost({ postId: id })

  return (
    // ...
  )
}

// App.tsx
export default function App () {
  // There will be only one API call instead of 3.
  return (
    <div>
      <Post id='1' />
      <Post id='2' />
      <Post id='3' />
    </div>
  )
}
```

## useSubsocialQueries

This hook can be used if you want to get multiple data, but want to have single loading state that you can manage in one place.

```tsx
// queries.ts
// ...
export function useGetPosts(data: GetPostData[], config?: QueryConfig) {
  return useSubsocialQueries({ key: getPostKey, data }, getPost, config)
}

// App.tsx
import { useIsAnyQueriesLoading } from 'subsocial-query'

const ids = ['1', '2', '3', '4', '5']
export default function App() {
  const results = useGetPosts(ids.map((id) => ({ postId: id })))
  const isLoading = useIsAnyQueriesLoading(results)

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        // If the Post have useQuery inside like the above Post.tsx,
        // you can just pass the id, and it will fetch the post data from the cache by itself.
        results.map(({ data }, index) => (
          <Post key={data?.id || `index-${index}`} id={data?.id ?? ''} />
        ))
      )}
    </div>
  )
}
```

## queryInvalidation

You can easily create query invalidation function with full typed parameter support with `queryInvalidation` function.

```tsx
// queries.ts
// ...
export const invalidateGetPost = queryInvalidation<GetPostData>(getPostKey)
// ...

// App.tsx
export default function App() {
  const invalidatePosts = () => {
    // If invalidated post data is needed in any rendered components, it will refetch the data.
    // The refetch posts will be pooled together too.
    invalidateGetPost({ postId: '1' })
    invalidateGetPost({ postId: '2' })
    invalidateGetPost({ postId: '3' })
  }
  return <button onClick={invalidatePosts}>Invalidate</button>
}
```

## useSubsocialMutation

This is used to easily create mutate function that signs txs and submits to the chain.

```tsx
// mutations.ts
import { IpfsContent, SpaceUpdate } from '@subsocial/api/substrate/wrappers'

export type UpdateSpacePayload = {
  name: string
  about?: string
  image?: File
  id: string
}
export function useUpdateSpace(config?: MutationConfig<UpdateSpacePayload>) {
  return useSubsocialMutation(
    // create a function getWallet that returns { address, signer }
    getWallet,
    async (data, api) => {
      const { image, name, about, id } = data
      let imageCid: string | undefined
      if (image) {
        imageCid = await api.ipfs.saveFile(image)
      }
      const spaceCid = await api.ipfs.saveContent({
        name: name || '',
        about: about || '',
        image: imageCid || null,
      })
      const substrateApi = await api.substrateApi
      const update = SpaceUpdate({
        content: IpfsContent(spaceCid),
      })
      const tx = substrateApi.tx.spaces.updateSpace(id, update)
      return { tx, summary: `Updating Space ${id}` }
    },
    config,
    {
      onSuccess: (hash, data) => {
        // invalidate the updated space everytime update space succeed
        const { id } = data
        invalidateGetSpace({ spaceId: id })
      },
    }
  )
}

// App.tsx
const dummySpace = {
  name: 'DUMMY SPACE',
  id: '1',
}
export default function App() {
  const { mutate } = useUpdateSpace()

  const updateSpace = () => {
    mutate(dummySpace)
  }

  return <button onClick={updateSpace}>Update Dummy Space</button>
}
```

#### Mutation Lifecycle Hook Setup

You can setup lifecycle hook for every mutation, so that you can for example display notification for every tx.

```tsx
// Example use of react-toastify
import { toast } from 'react-toastify'

setupTxCallbacks({
  onSuccess: ({ explorerLink, summary }) => {
    toast(
      `Transaction Success 🎉! Here's the link to the explorer ${explorerLink}`
    )
  },
  onBroadcast: () => {}, // hooks,
  onError: () => {}, // hooks,
})
```

## Other things...

This library can also be integrated with other services, not only subsocial SDK. For example, you can integrate graphql for this too, which makes it possible to integrate `subsquid` indexing graphql queries into the project with this package.

You can see the example in the [Example Project](https://github.com/teodorus-nathaniel/subsocial-query-example) under /src/services/squid.
