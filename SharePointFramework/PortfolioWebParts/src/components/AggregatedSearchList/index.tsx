import * as React from 'react';
import styles from './AggregatedSearchList.module.scss';
import * as PortfolioWebPartsStrings from 'PortfolioWebPartsStrings';
import { IAggregatedSearchListProps } from './IAggregatedSearchListProps';
import { IAggregatedSearchListState } from './IAggregatedSearchListState';
import { Spinner, SpinnerType } from 'office-ui-fabric-react/lib/Spinner';
import { ContextualMenuItemType } from 'office-ui-fabric-react/lib/ContextualMenu';
import { CommandBar, ICommandBarItemProps } from 'office-ui-fabric-react/lib/CommandBar';
import { MessageBar, MessageBarType } from 'office-ui-fabric-react/lib/MessageBar';
import { DetailsList, IColumn, IGroup } from 'office-ui-fabric-react/lib/DetailsList';
import { SearchBox } from 'office-ui-fabric-react/lib/SearchBox';
import { autobind } from 'office-ui-fabric-react/lib/Utilities';
import { sp } from '@pnp/sp';
import DataSourceService from 'prosjektportalen-spfx-shared/lib/services/DataSourceService';
import * as objectGet from 'object-get';
import * as stringFormat from 'string-format';

export default class AggregatedSearchList extends React.Component<IAggregatedSearchListProps, IAggregatedSearchListState> {
    /**
     * Constructor
     *
     * @param {IAggregatedSearchListProps} props Props
     */
    constructor(props: IAggregatedSearchListProps) {
        super(props);
        this.state = { isLoading: true, columns: props.columns };
    }

    public async componentDidMount(): Promise<void> {
        try {
            const items = await (this.props.customFetch ? this.props.customFetch(this.props) : this.fetchItems());
            this.setState({ items, isLoading: false });
        } catch (error) {
            this.setState({ error, isLoading: false });
        }
    }

    public render(): React.ReactElement<IAggregatedSearchListProps> {
        if (this.state.isLoading) {
            return (
                <div className={styles.aggregatedSearchList}>
                    <div className={styles.container}>
                        <Spinner label={stringFormat(PortfolioWebPartsStrings.DataLoadingText, this.props.dataSource.toLowerCase())} type={SpinnerType.large} />
                    </div>
                </div>
            );
        }
        if (this.state.error) {
            return (
                <div className={styles.aggregatedSearchList}>
                    <div className={styles.container}>
                        <MessageBar messageBarType={MessageBarType.error}>{this.state.error}</MessageBar>
                    </div>
                </div>
            );
        }

        let { items, columns, groups } = this.getFilteredData();

        return (
            <div className={styles.aggregatedSearchList}>
                <div className={styles.container}>
                    <div className={styles.commandBar}>
                        <CommandBar items={this.getCommandBarItems()} />
                    </div>
                    <div className={styles.header}>
                        <div className={styles.title}>{this.props.title}</div>
                    </div>
                    <div className={styles.searchBox}>
                        <SearchBox onChange={this.onSearch} labelText={stringFormat(PortfolioWebPartsStrings.SearchBoxLabelText, this.props.dataSource.toLowerCase())} />
                    </div>
                    <div className={styles.listContainer}>
                        <DetailsList
                            items={items}
                            columns={columns}
                            groups={groups}
                            onRenderItemColumn={this.onRenderItemColumn}
                            onColumnHeaderClick={this.onColumnHeaderSort} />
                    </div>
                </div>
            </div>
        );
    }

    /**
     * On search
     * 
     * Makes the search term lower case and sets state
     * 
     * @param {string} searchTerm Search term
     */
    @autobind
    private onSearch(searchTerm: string) {
        this.setState({ searchTerm: searchTerm.toLowerCase() });
    }

    /**
     * On render item column
     * 
     * @param {any} item Item
     * @param {number} index Index
     * @param {IColumn} column Column
     */
    @autobind
    private onRenderItemColumn(item: any, index: number, column: IColumn) {
        const fieldNameDisplay: string = objectGet(column, 'data.fieldNameDisplay');
        return column.onRender ? column.onRender(item, index, column) : objectGet(item, fieldNameDisplay || column.fieldName);
    }

    /**
     * Sorting on column header click
     *
  * @param {React.MouseEvent} _event Event
  * @param {IColumn} column Column
      */
    @autobind
    private onColumnHeaderSort(_event: React.MouseEvent<any>, column: IColumn): any {
        let { items, columns } = ({ ...this.state } as IAggregatedSearchListState);

        let isSortedDescending = column.isSortedDescending;
        if (column.isSorted) {
            isSortedDescending = !isSortedDescending;
        }
        items = items.concat([]).sort((a, b) => {
            let aValue = objectGet(a, column.fieldName);
            let bValue = objectGet(b, column.fieldName);
            return isSortedDescending ? (aValue > bValue ? -1 : 1) : (aValue > bValue ? 1 : -1);
        });
        columns = columns.map(_column => {
            _column.isSorted = (_column.key === column.key);
            if (_column.isSorted) {
                _column.isSortedDescending = isSortedDescending;
            }
            return _column;
        });
        this.setState({ items, columns });
    }

    /**
     * Get command bar items
     */
    private getCommandBarItems(): ICommandBarItemProps[] {
        const items: ICommandBarItemProps[] = [];

        if (this.props.groupByColumns && this.props.groupByColumns.length > 0) {
            const noGrouping: IColumn = {
                key: 'NoGrouping',
                fieldName: 'NoGrouping',
                name: PortfolioWebPartsStrings.NoGroupingText,
                minWidth: 0,
            };
            const subItems = [noGrouping, ...this.props.groupByColumns].map(item => ({
                key: item.key,
                name: item.name,
                onClick: () => this.setState({ groupBy: item }),
            }));
            items.push({
                key: 'Group',
                name: objectGet(this.state, 'groupBy.name') || PortfolioWebPartsStrings.NoGroupingText,
                iconProps: { iconName: 'GroupedList' },
                itemType: ContextualMenuItemType.Header,
                onClick: event => event.preventDefault(),
                subMenuProps: { items: subItems },
            });
        }

        return items;
    }



    /**
     * Get filtered data
     */
    private getFilteredData() {
        let { items, columns, groupBy, searchTerm } = ({ ...this.state } as IAggregatedSearchListState);
        let groups: IGroup[] = null;
        if (groupBy && groupBy.key !== 'NoGrouping') {
            const itemsSortedByGroupBy = items.sort((a, b) => objectGet(a, groupBy.key) > objectGet(b, groupBy.key) ? -1 : 1);
            const groupNames: string[] = itemsSortedByGroupBy.map(g => objectGet(g, groupBy.key));
            groups = groupNames
                .filter((value, index, self) => self.indexOf(value) === index)
                .map((name, idx) => ({
                    key: `Group_${idx}`,
                    name: `${groupBy.name}: ${name}`,
                    startIndex: groupNames.indexOf(name, 0),
                    count: [].concat(groupNames).filter(n => n === name).length,
                    isCollapsed: false,
                    isShowingAll: true,
                    isDropEnabled: false,
                }));
        }
        items = items.filter(item => JSON.stringify(item).toLowerCase().indexOf(searchTerm || '') !== -1);
        return { items, columns, groups };
    }

    /**
     * Fetch items
     */
    private async fetchItems(): Promise<any[]> {
        const dataSource = await new DataSourceService(sp.web).getByName(this.props.dataSource);
        if (dataSource) {
            const selectProperties = this.props.selectProperties || ['Path', 'SPWebUrl', ...this.props.columns.map(col => col.key)];
            try {
                const { PrimarySearchResults } = await sp.search({
                    ...dataSource,
                    Querytext: '*',
                    RowLimit: 500,
                    TrimDuplicates: false,
                    SelectProperties: selectProperties,
                });
                return PrimarySearchResults;
            } catch (err) {
                throw err;
            }
        } else {
            throw stringFormat(PortfolioWebPartsStrings.DataSourceNotFound, this.props.dataSource);
        }
    }
}