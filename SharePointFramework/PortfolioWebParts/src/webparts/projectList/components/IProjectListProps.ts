import { Web } from "@pnp/sp";
import { IProjectListWebPartProps } from "../IProjectListWebPartProps";

export interface IProjectListProps extends IProjectListWebPartProps {
  web: Web;
  siteId: string;
  siteAbsoluteUrl: string;
}
