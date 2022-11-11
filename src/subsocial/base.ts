import { SubsocialApi } from '@subsocial/api'
import { useMutation, UseMutationResult, useQuery } from '@tanstack/react-query'
import {
  createTxAndSend,
  generateQueryWrapper,
  makeCombinedCallback,
  mergeQueryConfig,
} from '..'
import {
  MutationConfig,
  QueryConfig,
  Transaction,
  WalletAccount,
} from '../types'
import { getSubsocialApi } from './connection'
import { Hash } from '@polkadot/types/interfaces'

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

export function useSubsocialMutation<Param>(
  wallet: WalletAccount,
  transactionGenerator: (
    params: Param,
    api: SubsocialApi
  ) => Promise<{ tx: Transaction; summary: string }>,
  config?: MutationConfig<Param>,
  defaultConfig?: MutationConfig<Param>
): UseMutationResult<Hash, Error, Param, unknown> {
  const workerFunc = async (param: Param) => {
    if (!wallet) throw new Error('You need to connect your wallet first!')
    const subsocialApi = await getSubsocialApi()
    return createTxAndSend(
      transactionGenerator,
      param,
      subsocialApi,
      { wallet, networkRpc: '' },
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
