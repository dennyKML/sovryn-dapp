import React, { useMemo } from 'react';

import { t } from 'i18next';

import { Button, ButtonType, ButtonStyle } from '@sovryn/ui';

import { translations } from '../../../../../../../locales/i18n';
import { VestingContractTableRecord } from '../../Vesting.types';
import { useHandleWithdraw } from '../../hooks/useHandleWithdraw';

export const WithdrawButton = (item: VestingContractTableRecord) => {
  const handleWithdraw = useHandleWithdraw(item);

  const isDisabled = useMemo(
    () => !item.availableBalance || item.availableBalance === '0',
    [item.availableBalance],
  );

  return (
    <Button
      onClick={handleWithdraw}
      text={t(translations.common.buttons.withdraw)}
      type={ButtonType.button}
      style={ButtonStyle.secondary}
      disabled={isDisabled}
    />
  );
};