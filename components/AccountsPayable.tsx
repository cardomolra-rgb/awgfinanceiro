import React from 'react';
import BillsList, { BillsListProps } from './BillsList';

const AccountsPayable: React.FC<Omit<BillsListProps, 'mode'>> = (props) => <BillsList mode="PAYABLE" {...props} />;

export default AccountsPayable;
