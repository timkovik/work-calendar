import { Injectable, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Config } from '../../config/config';
import { FileStorageService } from '../../file-storage/services/file-storage.service';
import { TaskService } from './task.service';

@Injectable()
export class VacationResolutionService {
  private readonly resolutionsFolderName = 'resolutions/';

  constructor(private taskService: TaskService, private fileStorage: FileStorageService, private config: Config) {}

  async updateTaskResolutionById(taskId: string, file) {
    if (this.config.FEATURE_FILE_STORAGE === 'YES' && !file) {
      throw new NotAcceptableException('Необходимо прикрепить файл');
    }

    const task = await this.taskService.getTaskById(taskId);

    if (!task) {
      throw new NotFoundException('Данные не найдены');
    }

    const attachment = await this.saveFileAndCreateAttachmentsEntity(file);

    this.taskService.udpdateOne(taskId, { attachment, approved: true });
  }

  private async saveFileAndCreateAttachmentsEntity(file?: any): Promise<{ fileName: string; originalName: string }> {
    if (!file) {
      return null;
    }

    const fileName = uuidv4() as string;

    try {
      await this.fileStorage.putObject(`${this.resolutionsFolderName}${fileName}`, file.buffer);
    } catch (e) {
      throw new NotAcceptableException('Ошибка при загрузке файла');
    }

    return {
      fileName,
      originalName: file.ogiginalName
    };
  }
}
