export interface UserContext {
    id: string;
    name?: string;
    role: string;
    department?: string;
    isActive: boolean;
}
export declare class AnalyticsScopeService {
    buildServerEnforcedScope(user?: UserContext): any;
    combineFilters(serverEnforcedScope: any, userRequestedFilters: any): any;
}
