import { Request, Response, NextFunction } from 'express';
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const generateToken: (userId: string, role: string) => any;
export declare const generateRefreshToken: (userId: string) => any;
export declare const verifyRefreshToken: (token: string) => any;
