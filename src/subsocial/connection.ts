import { getSubstrateApi, SubsocialApi } from '@subsocial/api'
import { SubsocialApiProps } from '@subsocial/api/types'

const DEFAULT_STAGING_CONFIG = {
  substrateUrl: 'wss://rco-para.subsocial.network',
  ipfsNodeUrl: 'https://staging-ipfs.subsocial.network',
  offchainUrl: 'https://staging-api.subsocial.network',
  useServer: {
    httpRequestMethod: 'get' as const,
  },
}
const DEFAULT_PROD_CONFIG = {
  substrateUrl: 'wss://para.f3joule.space',
  offchainUrl: 'https://app.subsocial.network/offchain',
  ipfsNodeUrl: 'https://ipfs.subsocial.network',
}

let subsocialApi: Promise<SubsocialApi> | null = null
const presets = {
  staging: DEFAULT_STAGING_CONFIG,
  prod: DEFAULT_PROD_CONFIG,
}
const DEFAULT_CONFIG_PRESET: keyof typeof presets = 'staging'
let config: Omit<SubsocialApiProps, 'substrateApi'> & { substrateUrl: string } =
  presets[DEFAULT_CONFIG_PRESET]
export const initSubsocialConfig = (
  preset: keyof typeof presets,
  customConfig?: SubsocialApiProps
) => {
  config = { ...presets[preset], ...customConfig }
}

export const getSubsocialApi = async () => {
  if (subsocialApi) return subsocialApi
  const api = connectToSubsocialApi(config)
  subsocialApi = api
  return subsocialApi
}

async function connectToSubsocialApi(
  config: Omit<SubsocialApiProps, 'substrateApi'> & { substrateUrl: string }
) {
  const substrateApi = await getSubstrateApi(config.substrateUrl)
  return new SubsocialApi({ substrateApi, ...config })
}
