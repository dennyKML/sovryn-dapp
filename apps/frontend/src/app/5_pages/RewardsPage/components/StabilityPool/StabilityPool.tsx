import React, { FC, useEffect, useMemo, useState } from 'react';

import { t } from 'i18next';
import { useLoaderData } from 'react-router-dom';

import {
  EthersLiquity,
  ReadableEthersLiquityWithStore,
} from '@sovryn-zero/lib-ethers';
import {
  Button,
  ButtonType,
  ButtonStyle,
  Table,
  ErrorBadge,
  ErrorLevel,
  Paragraph,
} from '@sovryn/ui';
import { Decimal } from '@sovryn/utils';

import { AmountRenderer } from '../../../../2_molecules/AmountRenderer/AmountRenderer';
import {
  CRITICAL_COLLATERAL_RATIO,
  MINIMUM_COLLATERAL_RATIO,
} from '../../../../3_organisms/ZeroLocForm/constants';
import {
  BITCOIN,
  BTC_RENDER_PRECISION,
  SOV,
} from '../../../../../constants/currencies';
import { useAccount } from '../../../../../hooks/useAccount';
import { useBlockNumber } from '../../../../../hooks/useBlockNumber';
import { useMaintenance } from '../../../../../hooks/useMaintenance';
import { useGetOpenTrove } from '../../../../../hooks/zero/useGetOpenTrove';
import { useGetRBTCPrice } from '../../../../../hooks/zero/useGetRBTCPrice';
import { useGetTroves } from '../../../../../hooks/zero/useGetTroves';
import { translations } from '../../../../../locales/i18n';
import { calculateCollateralRatio } from '../../../../../utils/helpers';
import { decimalic } from '../../../../../utils/math';
import { useGetSovGain } from '../../hooks/useGetSovGain';
import { useHandleRewards } from '../../hooks/useHandleRewards';
import { RewardsAction } from '../../types';
import { columns } from './StabilityPool.constants';

export const StabilityPool: FC = () => {
  const { account, signer } = useAccount();
  const [amount, setAmount] = useState<Decimal>(Decimal.ZERO);
  const isOpenTroveExists = useGetOpenTrove();
  const { value: block } = useBlockNumber();
  const [isUnderCollateralized, setIsUnderCollateralized] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const { price } = useGetRBTCPrice();

  const {
    data: troves,
    loading: loadingTroves,
    refetch: refetchTroves,
  } = useGetTroves();

  const { checkMaintenance, States } = useMaintenance();
  const claimLocked = useMemo(
    () =>
      checkMaintenance(States.REWARDS_FULL) ||
      checkMaintenance(States.ZERO_STABILITY_CLAIM),
    [States.REWARDS_FULL, States.ZERO_STABILITY_CLAIM, checkMaintenance],
  );

  const { sovGain, updateSOVGain } = useGetSovGain();

  const { liquity } = useLoaderData() as {
    liquity: EthersLiquity;
    provider: ReadableEthersLiquityWithStore;
  };

  const handleWithdraw = useHandleRewards(
    RewardsAction.withdrawFromSP,
    amount.toString(),
    updateSOVGain,
  );

  const handleTransferToLOC = useHandleRewards(
    RewardsAction.withdrawETHGainToTrove,
    amount.toString(),
    updateSOVGain,
  );

  useEffect(() => {
    if (!account) {
      return;
    }

    liquity.getTotal().then(result => {
      if (price) {
        const recoveryMode = result.collateralRatioIsBelowCritical(price);
        setIsRecoveryMode(recoveryMode);
      }
    });

    liquity
      .getStabilityDeposit(account)
      .then(result => setAmount(decimalic(result.collateralGain.toString())));
  }, [liquity, account, block, price]);

  const claimDisabled = useMemo(
    () =>
      (amount.isZero() && Decimal.from(sovGain).isZero()) ||
      !signer ||
      claimLocked ||
      loadingTroves ||
      isUnderCollateralized,
    [
      amount,
      claimLocked,
      signer,
      sovGain,
      isUnderCollateralized,
      loadingTroves,
    ],
  );

  const rows = useMemo(() => {
    if (amount.isZero() && decimalic(sovGain).isZero()) {
      return [];
    }

    return [
      {
        type: t(translations.rewardPage.stabilityPool.stabilityPoolRewards),
        amount: (
          <AmountRenderer
            value={amount}
            suffix={BITCOIN}
            precision={BTC_RENDER_PRECISION}
            dataAttribute="stability-rewards-amount"
          />
        ),
        action: (
          <div className="flex flex-row gap-3 w-full">
            <Button
              type={ButtonType.button}
              style={ButtonStyle.secondary}
              text={t(translations.rewardPage.stabilityPool.actions.withdraw)}
              onClick={handleWithdraw}
              disabled={claimDisabled || amount.isZero()}
              className="flex-1 lg:flex-initial"
              dataAttribute="stability-rewards-withdraw"
            />
            {isOpenTroveExists && !amount.isZero() && signer && (
              <Button
                type={ButtonType.button}
                style={ButtonStyle.secondary}
                text={t(
                  translations.rewardPage.stabilityPool.actions.transferToLOC,
                )}
                onClick={handleTransferToLOC}
                disabled={claimLocked}
                className="flex-1 lg:flex-initial"
                dataAttribute="stability-rewards-transfer-to-loc"
              />
            )}
          </div>
        ),
      },
      {
        type: t(translations.rewardPage.stabilityPool.stabilityPoolSubsidies),
        amount: (
          <AmountRenderer
            value={sovGain}
            suffix={SOV}
            precision={BTC_RENDER_PRECISION}
            dataAttribute="stability-subsidies-amount"
          />
        ),
        action: (
          <Button
            type={ButtonType.button}
            style={ButtonStyle.secondary}
            text={t(translations.rewardPage.stabilityPool.actions.withdraw)}
            onClick={handleWithdraw}
            disabled={claimDisabled || decimalic(sovGain).isZero()}
            className="w-full lg:w-auto"
            dataAttribute="stability-subsidies-withdraw"
          />
        ),
      },
    ];
  }, [
    amount,
    claimDisabled,
    claimLocked,
    handleTransferToLOC,
    handleWithdraw,
    isOpenTroveExists,
    signer,
    sovGain,
  ]);

  useEffect(() => {
    if (!account) {
      setAmount(Decimal.ZERO);
    }
  }, [account]);

  useEffect(() => {
    refetchTroves();
  }, [refetchTroves, block]);

  useEffect(() => {
    if (claimLocked || Number(price) === 0) {
      setIsUnderCollateralized(false);
      return;
    }

    if (troves?.troves) {
      const isLowTroveExists = troves.troves.reduce(
        (acc, { collateral, debt }) => {
          const collateralRatio = calculateCollateralRatio(
            decimalic(collateral),
            decimalic(debt),
            decimalic(price),
          );

          const isRatioBelowThreshold = isRecoveryMode
            ? collateralRatio.lt(CRITICAL_COLLATERAL_RATIO.mul(100))
            : collateralRatio.lt(MINIMUM_COLLATERAL_RATIO.mul(100));

          return acc || isRatioBelowThreshold;
        },
        false,
      );

      setIsUnderCollateralized(isLowTroveExists);
    }
  }, [troves, claimLocked, price, isRecoveryMode]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-gray-80 lg:py-4 lg:px-4 rounded w-full">
        <Table
          columns={columns}
          rows={rows}
          isLoading={!!account ? loadingTroves : false}
          rowKey={row => row.type}
          noData={
            !!account
              ? t(translations.rewardPage.stabilityPool.noRewards)
              : t(translations.rewardPage.stabilityPool.notConnected)
          }
          rowTitle={row => (
            <div className="flex flex-col items-start gap-1">
              <Paragraph className="text-gray-40">{row.type}</Paragraph>
              {row.amount}
            </div>
          )}
          mobileRenderer={row => (
            <div className="flex flex-col items-start gap-3">{row.action}</div>
          )}
        />
        {claimLocked && (
          <ErrorBadge
            level={ErrorLevel.Warning}
            message={t(translations.maintenanceMode.featureDisabled)}
          />
        )}

        {isUnderCollateralized && (
          <ErrorBadge
            level={ErrorLevel.Critical}
            message={t(
              translations.rewardPage.stabilityPool.undercollateralized,
            )}
            className="mb-0"
          />
        )}
      </div>
    </div>
  );
};