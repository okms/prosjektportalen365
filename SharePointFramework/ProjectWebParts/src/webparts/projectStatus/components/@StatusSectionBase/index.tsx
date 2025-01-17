import * as React from 'react';
import styles from './StatusSectionBase.module.scss';
import { IStatusSectionBaseProps } from './IStatusSectionBaseProps';
import { IStatusSectionBaseState } from './IStatusSectionBaseState';

export default class StatusSectionBase<P extends IStatusSectionBaseProps, S extends IStatusSectionBaseState> extends React.Component<P, S> {
    constructor(props: P) {
        super(props);
    }

    /**
     * Renders the <StatusSectionBase /> component
     */
    public render(): React.ReactElement<P> {
        return (
            <div className={styles.statusSection}>
                <div className={styles.container}>
                    {this.props.children}
                </div>
            </div>
        );
    }
}
