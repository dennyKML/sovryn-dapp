import React from 'react';

import { t } from 'i18next';

import { Paragraph, ParagraphSize, TransactionId } from '@sovryn/ui';

import { AmountRenderer } from '../../2_molecules/AmountRenderer/AmountRenderer';
import { translations } from '../../../locales/i18n';
import { Bitcoin } from '../../../utils/constants';
import {
  BitcoinTransfer,
  BitcoinTransferDirection,
} from '../../../utils/graphql/rsk/generated';
import {
  dateFormat,
  getBtcExplorerUrl,
  getRskExplorerUrl,
} from '../../../utils/helpers';
import { FundingHistoryType } from './types';

export const generateRowTitle = (item: FundingHistoryType) => (
  <Paragraph size={ParagraphSize.small}>
    {transactionTypeRenderer(item)}
    {' - '}
    {dateFormat(item.timestamp)}
  </Paragraph>
);

const rskExplorerUrl = getRskExplorerUrl();
const btcExplorerUrl = getBtcExplorerUrl();

export const transactionTypeRenderer = (item: FundingHistoryType) => {
  const type = t(
    translations.fundingHistory.transactionType[
      item.type === BitcoinTransferDirection.Outgoing ? 'withdraw' : 'deposit'
    ][`part${item.order}`],
  );
  return type;
};

const renderSentAmount = (item: FundingHistoryType) => {
  if (item.sent === '-') {
    return '⁠—';
  }

  return (
    <AmountRenderer
      value={item.sent}
      suffix={Bitcoin}
      precision={8}
      dataAttribute="funding-history-sent"
    />
  );
};
const renderReceivedAmount = (item: FundingHistoryType) => {
  if (item.received === '-') {
    return '⁠—';
  }

  return (
    <AmountRenderer
      value={item.received}
      suffix={Bitcoin}
      precision={8}
      dataAttribute="funding-history-received"
    />
  );
};

const renderServiceFee = (item: FundingHistoryType) => {
  if (item.serviceFee === '-') {
    return '⁠—';
  }

  return (
    <AmountRenderer
      value={item.serviceFee}
      suffix={Bitcoin}
      precision={8}
      dataAttribute="funding-history-service-fee"
    />
  );
};

const renderTXID = (item: FundingHistoryType) => {
  if (!item.txHash) {
    return '⁠—';
  }

  const href =
    (item.type === BitcoinTransferDirection.Outgoing && item.order === 1) ||
    (item.type === BitcoinTransferDirection.Incoming && item.order === 2)
      ? `${rskExplorerUrl}/tx/${item.txHash}`
      : `${btcExplorerUrl}/tx/${item.txHash}`;

  return (
    <TransactionId
      href={href}
      value={item.txHash}
      dataAttribute="funding-history-address-id"
    />
  );
};

//split each row returned from the graph into 2 rows (part 1 and part 2)
export const parseData = (item: BitcoinTransfer) => {
  const isOutgoing = item.direction === BitcoinTransferDirection.Outgoing;
  return [
    {
      timestamp: item.createdAtTimestamp,
      type: item.direction,
      order: 2,
      sent: '-',
      received: item.amountBTC,
      serviceFee: item.feeBTC,
      txHash: isOutgoing
        ? item.bitcoinTxHash?.substring(2) //TODO: remove after issue fixed on Graph
        : item.createdAtTx.id,
    },
    {
      timestamp: item.createdAtTimestamp,
      type: item.direction,
      order: 1,
      sent: item.totalAmountBTC,
      received: '-',
      serviceFee: '-',
      txHash: isOutgoing
        ? item.createdAtTx.id
        : item.bitcoinTxHash?.substring(2), //TODO: remove after issue fixed on Graph
    },
  ] as FundingHistoryType[];
};

export const columnsConfig = [
  {
    id: 'createdAtTimestamp',
    title: t(translations.common.tables.columnTitles.timestamp),
    cellRenderer: (item: FundingHistoryType) => dateFormat(item.timestamp),
    sortable: true,
  },
  {
    id: 'transactionType',
    title: t(translations.common.tables.columnTitles.transactionType),
    cellRenderer: transactionTypeRenderer,
  },
  {
    id: 'sent',
    title: t(translations.fundingHistory.table.sent),
    cellRenderer: renderSentAmount,
  },
  {
    id: 'received',
    title: t(translations.fundingHistory.table.received),
    cellRenderer: renderReceivedAmount,
  },
  {
    id: 'serviceFee',
    title: t(translations.fundingHistory.table.serviceFee),
    cellRenderer: renderServiceFee,
  },
  {
    id: 'txId',
    title: t(translations.common.tables.columnTitles.transactionID),
    cellRenderer: renderTXID,
  },
];