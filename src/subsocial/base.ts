import { SubsocialApi } from '@subsocial/api'
import { useMutation, UseMutationResult, useQuery } from '@tanstack/react-query'
import {
  createTxAndSend,
  makeCombinedCallback,
  mergeQueryConfig,
  queryWrapper,
} from '..'
import {
  MutationConfig,
  QueryConfig,
  Transaction,
  WalletAccount,
} from '../types'
import { getConnectionConfig, getSubsocialApi } from './connection'

export function useSubsocialQuery<ReturnValue, Params>(
  params: { key: string; data: Params | null },
  func: (params: Params, api: SubsocialApi) => Promise<ReturnValue>,
  config?: QueryConfig,
  defaultConfig?: QueryConfig<ReturnValue, Params>
) {
  const mergedConfig = mergeQueryConfig(config, defaultConfig)
  return useQuery(
    [params.key, params.data],
    queryWrapper(func, getSubsocialApi),
    mergedConfig
  )
}

export function useSubsocialMutation<Param>(
  wallet: WalletAccount,
  transactionGenerator: (
    params: Param,
    api: SubsocialApi
  ) => Promise<{ tx: Transaction; summary: string }>,
  config?: MutationConfig<Param>,
  defaultConfig?: MutationConfig<Param>
): UseMutationResult<string, Error, Param, unknown> {
  const workerFunc = async (param: Param) => {
    if (!wallet) throw new Error('You need to connect your wallet first!')
    const subsocialApi = await getSubsocialApi()
    return createTxAndSend(
      transactionGenerator,
      param,
      subsocialApi,
      { wallet, networkRpc: getConnectionConfig().substrateUrl },
      config,
      defaultConfig
    )
  }

  return useMutation(workerFunc, {
    ...(defaultConfig || {}),
    ...config,
    onSuccess: makeCombinedCallback(defaultConfig, config, 'onSuccess'),
    onError: makeCombinedCallback(defaultConfig, config, 'onError'),
  })
}
