import { useMemo } from 'react';

import { SupportedTokens } from '@sovryn/contracts';
import { Decimal } from '@sovryn/utils';

import { LoanItem } from '../../../../../5_pages/BorrowPage/components/OpenLoansTable/OpenLoansTable.types';
import { MINIMUM_COLLATERAL_RATIO_BORROWING_MAINTENANCE } from '../../../../../../constants/lending';
import { useMaxAssetBalance } from '../../../../../../hooks/useMaxAssetBalance';
import { useGetRBTCPrice } from '../../../../../../hooks/zero/useGetRBTCPrice';
import { decimalic } from '../../../../../../utils/math';
import { calculatePrepaidInterest } from '../../../../BorrowLoanForm/components/NewLoanForm/NewLoanForm.utils';
import { useGetMaximumCollateralAmount } from '../../../../BorrowLoanForm/components/NewLoanForm/hooks/useGetMaximumCollateralAmount';
import { normalizeToken } from '../AdjustLoanForm.utils';
import { useGetBorrowingAPR } from './useGetBorrowingAPR';
import { useGetCollateralAssetPrice } from './useGetCollateralAssetPrice';

export const useGetMaximumBorrowAmount = (
  loan: LoanItem,
  collateralAmount?: Decimal,
) => {
  const borrowToken = useMemo(
    () => normalizeToken(loan.debtAsset.toLowerCase()),
    [loan.debtAsset],
  );

  const collateralToken = useMemo(
    () => normalizeToken(loan.collateralAsset.toLowerCase()),
    [loan.collateralAsset],
  );

  const { weiBalance: borrowAssetBalance } = useMaxAssetBalance(borrowToken);

  const { maximumCollateralAmount } = useGetMaximumCollateralAmount(
    collateralToken,
    collateralAmount,
  );

  const collateral = useMemo(
    () =>
      !collateralAmount || collateralAmount.isZero()
        ? maximumCollateralAmount
        : collateralAmount,
    [collateralAmount, maximumCollateralAmount],
  );

  const debt = useMemo(() => loan.debt, [loan.debt]);

  const { borrowApr } = useGetBorrowingAPR(borrowToken, Decimal.from(debt));

  const { price: rbtcPrice } = useGetRBTCPrice();
  const { borrowPriceUsd, collateralPriceUsd } = useGetCollateralAssetPrice(
    borrowToken,
    collateralToken,
  );

  const collateralPriceInLoanAsset = useMemo(
    () =>
      decimalic(
        collateralToken === SupportedTokens.rbtc
          ? rbtcPrice
          : collateralPriceUsd,
      ).div(borrowToken === SupportedTokens.rbtc ? rbtcPrice : borrowPriceUsd),
    [
      borrowToken,
      borrowPriceUsd,
      collateralToken,
      collateralPriceUsd,
      rbtcPrice,
    ],
  );

  const maximumLoanToCollateralRatio = useMemo(
    () => Decimal.ONE.div(MINIMUM_COLLATERAL_RATIO_BORROWING_MAINTENANCE),
    [],
  );

  const maxBorrow = useMemo(
    () =>
      collateral
        .mul(collateralPriceInLoanAsset)
        .mul(maximumLoanToCollateralRatio),
    [collateralPriceInLoanAsset, collateral, maximumLoanToCollateralRatio],
  );

  const prepaidInterest = useMemo(
    () => calculatePrepaidInterest(borrowApr, maxBorrow, loan.rolloverDate),
    [borrowApr, loan.rolloverDate, maxBorrow],
  );

  const result: Decimal = useMemo(
    () => maxBorrow.sub(prepaidInterest).sub(debt),
    [debt, maxBorrow, prepaidInterest],
  );

  return result.gt(Decimal.fromBigNumberString(borrowAssetBalance))
    ? Decimal.fromBigNumberString(borrowAssetBalance)
    : result;
};