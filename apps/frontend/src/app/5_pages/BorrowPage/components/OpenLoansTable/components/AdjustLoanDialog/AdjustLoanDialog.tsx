import React, { FC, useMemo } from 'react';

import { t } from 'i18next';

import { SupportedTokens } from '@sovryn/contracts';
import {
  Dialog,
  DialogBody,
  DialogHeader,
  ErrorBadge,
  ErrorLevel,
} from '@sovryn/ui';

import { useMaintenance } from '../../../../../../../hooks/useMaintenance';
import { translations } from '../../../../../../../locales/i18n';
import { useGetBorrowMaintenance } from '../../../../hooks/useGetBorrowMaintenance';

type AdjustLoanDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const AdjustLoanDialog: FC<AdjustLoanDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { checkMaintenance } = useMaintenance();
  // TODO: to be replaced with pool asset
  const states = useGetBorrowMaintenance(SupportedTokens.rbtc);

  const locked = useMemo(() => {
    return (
      // TODO: should check based on the form state REPAY/ADD_COLLATERAL/BORROW
      (states.REPAY && checkMaintenance(states.REPAY)) ||
      checkMaintenance(states.FULL)
    );
  }, [checkMaintenance, states.FULL, states.REPAY]);

  return (
    <Dialog isOpen={isOpen}>
      <DialogHeader
        title={t(translations.fixedInterestPage.adjustLoanDialog.title)}
        onClose={onClose}
      ></DialogHeader>
      <DialogBody>
        Adjust a loan
        {locked && (
          <ErrorBadge
            level={ErrorLevel.Warning}
            message={t(translations.maintenanceMode.featureDisabled)}
          />
        )}
      </DialogBody>
    </Dialog>
  );
};