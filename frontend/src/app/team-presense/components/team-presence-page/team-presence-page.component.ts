import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';

import * as moment from 'moment';
import { BehaviorSubject, forkJoin, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, first, map, share, switchMap, tap } from 'rxjs/operators';
import { EmployeeApiService } from 'src/app/core/services/employee-api.service';

import { DictionaryApiService } from '../../../core/services/dictionary-api.service';
import { HolidaysApiService } from '../../../core/services/holidays-api.service';
import { TaskApiService } from '../../../core/services/task-api.service';
import { ContextStoreService } from '../../../core/store/context-store.service';
import { SelectInputDataModel } from '../../../shared/components/single-select/single-select.component';
import { locationsDictionary } from '../../../shared/const/locations-dictionary.const';
import { DictionaryModel } from '../../../shared/models/dictionary.model';
import { HolidaysModel } from '../../../shared/models/holidays.model';
import { PresenceModel } from '../../../shared/models/presence.page.model';

@Component({
  selector: 'app-team-presence',
  templateUrl: './team-presence-page.component.html',
  styleUrls: ['./team-presence-page.component.scss'],
})
export class TeamPresencePageComponent implements OnInit, OnDestroy {
  private qParamsSnapshotMonth = this.route.snapshot.queryParams.date;
  public date$ = new BehaviorSubject<moment.Moment>(
    this.qParamsSnapshotMonth ? moment(this.qParamsSnapshotMonth, 'MM-YYYY') : moment()
  );

  public monthData$: Observable<PresenceModel[]>;
  public monthDays$: Observable<moment.Moment[]>;

  public filtersForm: FormGroup;
  public holidays: HolidaysModel[];
  public projects: SelectInputDataModel[];
  public jobPositions: SelectInputDataModel[];
  public subdivisions: SelectInputDataModel[];
  public locations: SelectInputDataModel[];
  public loadInProgress;

  private subscription = new Subscription();

  constructor(
    private tasksApi: TaskApiService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private dictionaryApi: DictionaryApiService,
    private holidaysApi: HolidaysApiService,
    private contextStoreService: ContextStoreService,
    private employeeApiService: EmployeeApiService
  ) {}

  ngOnInit() {
    this.initFilterForm(this.route.snapshot.queryParams);

    this.monthDays$ = this.getMonthDays();

    this.getCommonData();

    this.monthData$ = this.date$.pipe(
      map((date) => date.format('YYYY-MM-DD')),
      distinctUntilChanged(),
      tap(() => (this.loadInProgress = true)),
      switchMap((date) => this.tasksApi.loadTasksByMonth(date)),
      tap(() => (this.loadInProgress = false)),
      share()
    );

    this.updateQueryParamsOnChange();

    this.setUserCurrentProjectToFilter();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private getCommonData() {
    const locations$ = this.employeeApiService.getEmployeesLocations();
    const holidays$ = this.holidaysApi.getAllHolidays();
    const projects$ = this.dictionaryApi.getAll('project');
    const jobPositions$ = this.dictionaryApi.getAll('jobPosition');
    const subdivisions$ = this.dictionaryApi.getAll('subdivision');

    this.subscription.add(
      forkJoin([holidays$, projects$, jobPositions$, subdivisions$, locations$]).subscribe((res) => {
        const [holidays, projects, jobPositions, subdivisions, location] = res;

        this.holidays = holidays;
        this.projects = projects.map((item) => this.mapperToSelectInputDataModel(item));
        this.jobPositions = jobPositions.map((item) => this.mapperToSelectInputDataModel(item));
        this.subdivisions = subdivisions.map((item) => ({ value: item.name, name: item.name }));
        this.locations = location.filter((value) => !!value).map((item) => ({ value: item, name: item }));
      })
    );
  }

  private mapperToSelectInputDataModel(item: DictionaryModel): SelectInputDataModel {
    return {
      value: item._id,
      name: item.name,
    };
  }

  public prevMonth(): void {
    this.date$.next(this.date$.value.clone().subtract(1, 'months'));
  }

  public nextMonth(): void {
    this.date$.next(this.date$.value.clone().add(1, 'months'));
  }

  private updateQueryParamsOnChange() {
    this.subscription.add(
      this.date$.subscribe((date) => {
        this.router.navigate([], {
          queryParams: { ...this.route.snapshot.queryParams, date: moment(date).format('MM-YYYY') },
        });
      })
    );

    this.subscription.add(
      this.filtersForm.valueChanges.subscribe((filters) =>
        this.router.navigate([], {
          queryParams: { ...this.route.snapshot.queryParams, ...filters },
        })
      )
    );

    this.subscription.add(
      this.route.queryParams.subscribe((res) => {
        return this.filtersForm.patchValue(res);
      })
    );
  }

  private getMonthDays(): Observable<moment.Moment[]> {
    return this.date$.pipe(
      map((date) => {
        const startOfMonth = date.clone().startOf('month');
        const daysInMonth = date.daysInMonth();

        return Array.from(Array(daysInMonth).keys()).map((i) => startOfMonth.clone().add(i, 'day'));
      })
    );
  }

  private initFilterForm(filters?: Params): void {
    this.filtersForm = this.fb.group({
      name: [''],
      subdivision: [null],
      jobPosition: [null],
      project: [null],
      location: [null],
    });

    if (filters) {
      this.filtersForm.patchValue(filters);
    }
  }

  // выставляем текущий проект как основной у пользователя.
  private setUserCurrentProjectToFilter(): void {
    if (this.route?.snapshot?.queryParams?.project || this.route?.snapshot?.queryParams?.fromFilter) {
      return;
    }

    this.contextStoreService
      .getCurrentUser$()
      .pipe(
        first(),
        filter((u) => !!u?.lastProjects?.length)
      )
      .subscribe((user) => {
        const maxLastProject = user.lastProjects.sort((a, b) => b.percent - a.percent)[0];

        this.filtersForm.patchValue({ project: maxLastProject?.project_id });
      });
  }
}
