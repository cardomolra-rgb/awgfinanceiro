import React from 'react';
import BillsList, { BillsListProps } from './BillsList';

const AccountsReceivable: React.FC<Omit<BillsListProps, 'mode'>> = (props) => <BillsList mode="RECEIVABLE" {...props} />;

export default AccountsReceivable;
