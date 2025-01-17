import * as strings from 'ExperienceLogWebPartStrings';
import { ExperienceLogColumns } from './ExperienceLogColumns';
import { IExperienceLogWebPartProps } from '../IExperienceLogWebPartProps';

export interface IExperienceLogProps extends IExperienceLogWebPartProps { }

export const ExperienceLogDefaultProps: Partial<IExperienceLogProps> = {
  title: strings.Title,
  columns: ExperienceLogColumns,
  excelExportConfig: {
    fileNamePrefix: strings.ExcelExportFileNamePrefix,
    sheetName: 'Sheet A',
  },
};
