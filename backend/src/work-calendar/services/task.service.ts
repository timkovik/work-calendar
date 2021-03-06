import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';
import { TaskEntity } from '../../entity/entities/task.entity';
import { UserEntity } from '../../entity/entities/user.entity';
import { SendMailRequestModel } from '../../mail/models/send-mail.request.model';
import { SendMailService } from '../../mail/services/send-mail.service';
import { FollowService } from '../../profile/services/follow.service';
import { UsersService } from '../../profile/services/users.service';
import { WebPushService } from '../../web-push/services/web-push.service';
import { TaskDto } from '../dto/task.dto';
import { PresenceModel } from '../models/presence.model';
import { TaskType } from '../models/task-type.enum';
import { DateFormatter } from '../../shared/services/date-formatter.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger('TaskService');

  constructor(
    @InjectModel('Tasks') private readonly taskModel: Model<TaskEntity>,
    private sendMailService: SendMailService,
    private userService: UsersService,
    private followService: FollowService,
    private webPushService: WebPushService,
    private dateFormatter: DateFormatter
  ) {}

  async getTasks(): Promise<TaskEntity[]> {
    return await this.taskModel.find().exec();
  }

  async getTaskById(id: string): Promise<TaskEntity> {
    return await this.taskModel.findById(id);
  }

  async getTasksByAuthor(author: string): Promise<TaskEntity[]> {
    return await this.taskModel.find({ employeeCreated: author }).exec();
  }

  async getTasksByEmployee(employee: string): Promise<TaskEntity[]> {
    return await this.taskModel.find({ employee }).exec();
  }

  async udpdateOne(id: string, task: Partial<TaskDto>): Promise<TaskEntity> {
    await this.taskModel.findByIdAndUpdate(id, task);
    return await this.taskModel.findById(id);
  }

  async deleteById(id: string): Promise<TaskEntity> {
    return await this.taskModel.findByIdAndDelete(id);
  }

  async getTasksByMonth(date: string): Promise<PresenceModel[]> {
    const startOfMonth = moment(date)
      .startOf('month')
      .format('YYYY-MM-DD');
    const endOfMonth = moment(date)
      .endOf('month')
      .format('YYYY-MM-DD');

    const users = await this.userService.getUsers();
    const tasks = await this.getTasksInPeriod(startOfMonth, endOfMonth);

    const day = moment(date).startOf('month');

    const monthDays = Array.from(Array(day.daysInMonth()).keys()).map(i => day.clone().add(i, 'day'));

    const result = users
      /** Отсеять сотрудников, уволившихся до начала выбранного месяца */
      .filter(user => this.filterTerminatedEmployeesByStartOfMonth(user, date))
      .map(employee => {
        const currentUserTasks = tasks.filter(i => i.employee === employee.mailNickname);

        return {
          employee,
          tasks: monthDays.map(d => this.getLastTaskInCurrentDay(currentUserTasks, d))
        };
      });

    return result;
  }

  private filterTerminatedEmployeesByStartOfMonth(user: UserEntity, date: string): boolean {
    if (!user.terminationDate) {
      return true;
    }
    const startOfMonth = moment(date).startOf('month');
    const employeeTerminationDate = moment(user.terminationDate);
    return startOfMonth.isBefore(employeeTerminationDate);
  }

  private getLastTaskInCurrentDay(currentUserTasks: TaskEntity[], currentDay: moment.Moment): TaskEntity {
    const currentDayTasks = currentUserTasks
      .filter(i => {
        if (i.dateEnd) {
          return currentDay.isBetween(moment(i.dateStart, 'YYYY-MM-DD'), moment(i.dateEnd, 'YYYY-MM-DD'), 'day', '[]');
        }

        return currentDay.isSame(moment(i.dateStart, 'YYYY-MM-DD'), 'day');
      })
      .sort((a, b) => (moment(a.dtCreated).isAfter(moment(b.dtCreated)) ? -1 : 1));

    const lastTask = currentDayTasks[0] || ({ dateStart: currentDay.format('YYYY-MM-DD') } as TaskEntity);

    return lastTask;
  }

  private async getTasksInPeriod(dateStart: string, dateEnd: string) {
    // a >= start <= b  || a >= end <= b || start < a && end > b
    return await this.taskModel.find({
      $or: [
        {
          dateStart: {
            $gte: dateStart,
            $lte: dateEnd
          }
        },
        {
          dateEnd: {
            $gte: dateStart,
            $lte: dateEnd
          }
        },
        {
          $and: [
            {
              dateStart: {
                $lte: dateStart
              }
            },
            {
              dateEnd: {
                $gte: dateEnd
              }
            }
          ]
        }
      ]
    });
  }

  async addTask(task: TaskDto): Promise<TaskEntity> {
    this.sendMail(task);
    this.sendPush(task);

    const { _id = null, ...newTask } = task;

    return await this.taskModel.create(newTask);
  }

  private async generateAddressArray(userSubject: UserEntity, userCreated: UserEntity): Promise<UserEntity[]> {
    const userFollowers = await this.followService.getUserFollowers(userSubject.id);
    let addressesArray = userFollowers;

    if (userSubject.id.toString() !== userCreated.id.toString()) {
      addressesArray = [...addressesArray, userSubject];
    }

    return addressesArray;
  }

  private async sendPush(task: TaskDto): Promise<void> {
    try {
      const userSubject = await this.userService.getUserByLogin(task.employee);
      const userCreated = await this.userService.getUserByLogin(task.employeeCreated);
      const addressesArray = (await this.generateAddressArray(userSubject, userCreated)).map(user => user.mailNickname);

      if (!addressesArray.length) {
        return;
      }

      const dateStart = this.dateFormatter.parseDateStringToRussianLocale(task.dateStart);

      let body = `Пользователь ${userCreated.username} изменил присутсвие на ${dateStart} для ${
        userSubject.username
      } на ${this.getTaskTypeName(task.type as TaskType)}`;

      if (task.dateEnd) {
        const dateEnd = this.dateFormatter.parseDateStringToRussianLocale(task.dateEnd);
        body = `Пользователь ${userCreated.username} изменил присутсвие c ${dateStart} по ${dateEnd} для ${
          userSubject.username
        } на ${this.getTaskTypeName(task.type as TaskType)}`;
      }

      const notification = {
        notification: {
          title: 'Изменение присутствия',
          body,
          icon: `https://calendar.it2g.ru/backend/avatar?login=${userSubject.mailNickname}`,
          vibrate: [100, 50, 100],
          data: {
            dateOfArrival: Date.now().toLocaleString(),
            primaryKey: 1
          },
          actions: [
            {
              action: 'explore',
              title: 'подробности'
            }
          ]
        }
      };

      const notifications = addressesArray.map(address =>
        this.webPushService.sendPushNotification(address, notification)
      );

      await Promise.all(notifications);
    } catch (e) {
      this.logger.error('Ошибка при отправке пуша', e.stack);
    }
  }

  private async sendMail(task: TaskDto): Promise<void> {
    try {
      const userSubject = await this.userService.getUserByLogin(task.employee);
      const userCreated = await this.userService.getUserByLogin(task.employeeCreated);
      const addressesArray = (await this.generateAddressArray(userSubject, userCreated))
        .filter(user => !user.terminationDate)
        .map(user => user.email);

      if (!addressesArray.length) {
        return;
      }

      const mailData: SendMailRequestModel = {
        address: addressesArray,
        author: userCreated.username,
        date: task.dateStart,
        user: userSubject.username,
        status: this.getTaskTypeName(task.type as TaskType),
        comment: task.comment,
        dateEnd: task.dateEnd
      };

      await this.sendMailService.sendMail(mailData);
    } catch (e) {
      this.logger.error('Ошибка при отправке почты', e.stack);
    }
  }

  private getTaskTypeName(type: TaskType): string {
    const taskTypeMap = Object.freeze({
      [TaskType.COMMON]: 'Стандартно',
      [TaskType.CUSTOM]: 'Особое',
      [TaskType.LEFT]: 'Отсутствие',
      [TaskType.VACATION]: 'Отпуск',
      [TaskType.SICK]: 'Болезнь'
    });

    if (taskTypeMap[type]) {
      return taskTypeMap[type];
    }

    return 'Статус не определен';
  }
}
