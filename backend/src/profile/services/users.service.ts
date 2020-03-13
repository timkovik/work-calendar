import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from '../../entity/entities/user.entity';
import { UserDto } from '../dto/user.dto';
import { RefreshToken } from '../models/refresh-token.model';

@Injectable()
export class UsersService {
  constructor(@InjectModel('Users') private readonly userModel: Model<UserEntity>) {}

  async getUsers(): Promise<UserEntity[]> {
    return await this.userModel
      .find()
      .populate('jobPosition')
      .populate('subdivision')
      .sort({ username: 'asc' })
      .exec();
  }

  async getUserByLogin(mailNickname: string): Promise<UserEntity> {
    const employeeRegex = new RegExp(`^${mailNickname}$`, 'i');
    return await this.userModel
      .findOne({ mailNickname: employeeRegex })
      .populate('jobPosition')
      .populate('subdivision')
      .exec();
  }

  async getUserById(id: string): Promise<UserEntity> {
    return await this.userModel
      .findById(id)
      .populate('jobPosition')
      .populate('subdivision')
      .exec();
  }

  async addUser(userInfo: UserDto): Promise<UserEntity> {
    const newUser = await this.userModel.create(userInfo);
    return newUser.save();
  }

  async updateUserByLogin(login: string, data: UserDto): Promise<UserEntity> {
    await this.userModel.updateOne({ mailNickname: login }, { ...data });
    return await this.getUserByLogin(login);
  }

  /** Сохранить новый токен в бд */
  async storeRefreshToken(login: string, token: RefreshToken): Promise<UserEntity> {
    await this.userModel.updateOne({ mailNickname: login }, { $push: { refreshTokens: token } });
    return await this.getUserByLogin(login);
  }

  /** Удалить протухшие токены в бд */
  async removeOutdatedTokens(login: string, expiryDate: Date): Promise<UserEntity> {
    await this.userModel.updateOne(
      { mailNickname: login },
      { $pull: { refreshTokens: { date: { $lte: expiryDate } } } }
    );
    return await this.getUserByLogin(login);
  }
}
