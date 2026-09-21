import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LessonsService } from './lessons.service';
import { ExercisesService } from './exercises.service';
import { ProgressService } from './progress.service';

@Module({
  controllers: [LearningController],
  providers: [LessonsService, ExercisesService, ProgressService],
  exports: [LessonsService, ExercisesService],
})
export class LearningModule {}
