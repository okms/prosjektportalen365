import { DataField } from './DataField';
import {ChartData} from './ChartData';
import { ISPChartConfiguration } from '../interfaces/ISPChartConfiguration';
import { ChartConfigBaseContentTypeId, ChartTypes } from '../config';
import { ISPDataSource } from '../interfaces/ISPDataSource';
import * as objectAssign from 'object-assign';

export class ChartConfiguration {
    public item: ISPChartConfiguration;
    public searchQuery: ISPDataSource;
    public fields: DataField[];
    public data: ChartData;
    public type: string;
    public width: { [key: string]: number };

    constructor(item: ISPChartConfiguration, fields: DataField[]) {
        this.item = item;
        this.searchQuery = item.GtPiDataSourceLookup;
        this.fields = fields;
        this.initType(item.ContentTypeId);
        this.initWidth(item);
    }

    public clone(): ChartConfiguration {
        return objectAssign(Object.create(this), this);
    }

    /**
     * Initialize chart type from content type id
     * 
     * @param {string} contentTypeId Content type id
     */
    protected initType(contentTypeId: string) {
        const typeIndex = parseInt(contentTypeId.replace(ChartConfigBaseContentTypeId, '').substring(0, 2), 10) - 1;
        this.type = ChartTypes[typeIndex];
    }

    /**
     * Initialize width properties
     * 
     * @param {ISPChartConfiguration} item Item
     */
    protected initWidth(item: ISPChartConfiguration) {
        this.width = {
            sm: item.GtPiWidthSm,
            md: item.GtPiWidthMd,
            lg: item.GtPiWidthLg,
            xl: item.GtPiWidthXl,
            xxl: item.GtPiWidthXxl,
            xxxl: item.GtPiWidthXxxl,
        };
    }


    private getBaseConfig() {
        let base: any = {};
        base.chart = { type: this.type };
        base.title = { text: this.item.Title };
        base.subtitle = { text: this.item.GtPiSubTitle };
        base.tooltip = { valueSuffix: '' };
        base.credits = { enabled: false };
        return base;
    }

    public generateSeries(type: string) {
        switch (type) {
            case 'column': {
                return this.fields.map(sf => {
                    const values = this.data.getValues(sf);
                    return { name: sf.title, data: values };
                });
            }
            case 'bar': {
                if (this.fields.length === 1) {
                    const [field] = this.fields;
                    switch (field.type) {
                        case 'Text': {
                            const stringValues = this.data.getValuesUnique(field);
                            const data = stringValues.map(value => this.data.getItemsWithStringValue(field, value).length);
                            return [{ name: field.title, data }];
                        }
                    }
                }
                return this.fields.map(sf => {
                    const values = this.data.getValues(sf);
                    return { name: sf.title, data: values };
                });
            }
            case 'pie': {
                let data: any[];
                if (this.fields.length === 1) {
                    const [field] = this.fields;
                    switch (field.type) {
                        case 'Number': {
                            data = this.data.getItems(field).map((i, index) => {
                                const y = this.data.getPercentage(field, index);
                                return { name: i.name, y };
                            });
                        }
                            break;
                        case 'Text': {
                            data = this.data.getValuesUnique(field).map(value => {
                                const itemsMatch = this.data.getItemsWithStringValue(field, value);
                                const name = value || 'N/A';
                                const y = (itemsMatch.length / this.data.getCount()) * 100;
                                return { name, y };
                            });
                        }
                            break;
                    }
                } else {
                    data = this.fields.map(sf => {
                        const y = this.data.getAverage(sf);
                        return { name: sf.title, y };
                    });
                }
                return [{ type: 'pie', colorByPoint: true, data }];
            }
            default: {
                throw null;
            }
        }
    }

    /**
     * Generate HighChart chart config
     */
    public generateHighChartConfig() {
        try {
            let chartConfig: any = { ...this.getBaseConfig() };
            switch (this.type) {
                case 'bar': {
                    chartConfig.series = this.generateSeries(this.type);
                    chartConfig.xAxis = this.getXAxis();
                    chartConfig.yAxis = this.getYAxis();
                    chartConfig.legend = this.getLegend();
                    chartConfig.plotOptions = { bar: { dataLabels: { enabled: true } } };
                    break;
                }
                case 'column': {
                    chartConfig.series = this.generateSeries(this.type);
                    chartConfig.xAxis = this.getXAxis();
                    chartConfig.yAxis = this.getYAxis();
                    chartConfig.legend = this.getLegend();
                    chartConfig.plotOptions = { series: { stacking: false } };
                    break;
                }
                case 'pie': {
                    chartConfig.series = this.generateSeries(this.type);
                    chartConfig.plotOptions = {
                        pie: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            dataLabels: {
                                enabled: true,
                                format: '<b>{point.name}</b>: {point.percentage: .1f} %',
                                style: { color: 'black' },
                            },
                        },
                    };
                    chartConfig.tooltip = { pointFormat: '<b>{point.percentage: .1f}%</b>' };
                }
                    break;
            }
            return chartConfig;
        } catch (errText) {
            throw `<b>${this.item.Title}:</b> ${errText}`;
        }
    }

    /**
     * Get Y axis
     */
    protected getYAxis() {
        let yAxis: any = {
            title: { text: '', align: 'high' },
            labels: { overflow: 'justify' },
        };
        // if (this.yAxisMin) {
        //     yAxis.min = this.yAxisMin;
        // }
        // if (this.yAxisMax) {
        //     yAxis.max = this.yAxisMax;
        // }
        // if (this.yAxisTickInterval) {
        //     yAxis.tickInterval = this.yAxisTickInterval;
        // }
        return yAxis;
    }

    /**
     * Get X axis based on type
     */
    protected getXAxis() {
        let categories = this.data.getNames();
        if (this.fields.length === 1) {
            categories = this.data.getNames(this.fields[0]);
        }
        switch (this.type) {
            case 'bar': {
                if (this.fields.length === 1) {
                    const [field] = this.fields;
                    switch (field.type) {
                        case 'Text': {
                            categories = this.data.getValuesUnique(field);
                        }
                            break;
                    }
                }
                return { categories, title: { text: '' } };
            }
            default: {
                return { categories, title: { text: '' } };
            }
        }
    }

    /**
     * Get legend
     */
    protected getLegend() {
        switch (this.type) {
            case 'bar': {
                return { layout: 'vertical' };
            }
            case 'column': {
                return { reversed: true };
            }
        }
    }
}
