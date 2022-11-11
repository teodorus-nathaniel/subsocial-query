import { SubsocialApi } from '@subsocial/api'
import { useQuery } from '@tanstack/react-query'
import { generateQueryWrapper, mergeQueryConfig } from '..'
import { QueryConfig } from '../types'
import { getSubsocialApi } from './connection'

export const subsocialQueryWrapper = generateQueryWrapper(async () => null)

export function useSubsocialQuery<ReturnValue, Params>(
  params: { key: string; data: Params | null },
  func: (data: {
    params: Params
    additionalData: SubsocialApi
  }) => Promise<ReturnValue>,
  config?: QueryConfig,
  defaultConfig?: QueryConfig<ReturnValue, Params>
) {
  const mergedConfig = mergeQueryConfig(config, defaultConfig)
  return useQuery(
    [params.key, params.data],
    subsocialQueryWrapper(func, getSubsocialApi),
    mergedConfig
  )
}
