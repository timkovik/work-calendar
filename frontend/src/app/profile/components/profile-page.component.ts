import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import * as moment from 'moment';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { EmployeeApiService } from '../../core/services/employee-api.service';
import { FollowApiService } from '../../core/services/follow-api.service';
import { ContextStoreService } from '../../core/store/context-store.service';
import { DictionaryModel } from '../../shared/models/dictionary.model';
import { Employee } from '../../shared/models/employee.model';
import { FollowModel, UserFollow } from '../../shared/models/follow.model';
import { ProjectNewModel, ProjectStatsMetadataNewModel } from '../../shared/models/project-new.model';
import { SettingsModel } from '../../shared/models/settings.model';
import { NewProjectUtils } from '../../shared/utils/new-project.utils';

@Component({
  selector: 'app-team',
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss'],
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  public selectedUser: Employee;
  public currentUser$: Observable<Employee>;
  public isAdmin$: Observable<boolean>;
  public canEdit$: Observable<boolean>;
  private login: string;
  public projects: DictionaryModel[];
  public selectedTabIndex = this.route.snapshot.queryParams.tab || 0;

  public isMobile: boolean;
  public subscription: Subscription = new Subscription();

  public baseUrl = environment.baseUrl;

  public users$: Observable<Employee[]>;
  public settings$: Observable<SettingsModel>;

  public userFollow: UserFollow;

  private userSubscriptions = new Subscription();

  constructor(
    private contextStoreService: ContextStoreService,
    private employeeApiService: EmployeeApiService,
    private route: ActivatedRoute,
    private router: Router,
    private followApi: FollowApiService,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit() {
    this.users$ = this.employeeApiService.loadAllEmployees();

    this.currentUser$ = this.contextStoreService.getCurrentUser$().pipe(filter((user) => !!user));
    this.isAdmin$ = this.contextStoreService.isCurrentUserAdmin$();
    this.settings$ = this.contextStoreService.settings$.pipe(filter((s) => !!s));
    this.getUserInfo();

    this.subscription = this.breakpointObserver
      .observe(['(max-width: 767px)'])
      .subscribe((result) => (this.isMobile = result.matches));

    this.subscribeToSelectedUserChange();
  }

  ngOnDestroy() {
    this.userSubscriptions.unsubscribe();
    this.subscription.unsubscribe();
  }

  private subscribeToSelectedUserChange() {
    this.contextStoreService.getSelectedUser().subscribe((user) => {
      this.selectedUser = user;
    });
  }

  public onUpdateProfile(employee: Employee): void {
    this.employeeApiService.updateUserInfo(this.login, employee).subscribe(() => {
      this.loadFollow(this.selectedUser._id);
    });
  }

  public updateSelectedUser(employee: Employee): void {
    this.selectedUser = employee;
    this.contextStoreService.setSelectedUser(employee);
  }

  public addFollow(data: FollowModel): void {
    this.followApi.addFollow(data).subscribe((res) => this.loadFollow(this.selectedUser._id));
  }

  public deleteFollowing(id: string) {
    this.followApi.deleteFollow(id).subscribe((res) => this.loadFollow(this.selectedUser._id));
  }

  public getAvatarSrc() {
    return `${environment.baseUrl}/avatar?login=` + this.login;
  }

  public tabChange(id: number) {
    this.router.navigate([], {
      queryParams: { ...this.route.snapshot.queryParams, tab: id },
    });
  }

  private getUserInfo(): void {
    this.userSubscriptions.add(
      this.route.params
        .pipe(switchMap((params: { id?: string }) => (params.id ? this.getUserFromApi(params.id) : this.currentUser$)))
        .subscribe((user) => {
          this.contextStoreService.setSelectedUser(user);
          this.selectedUser = user;
          this.login = user.mailNickname;
          this.loadFollow(user._id);
          this.canEdit$ = this.getCanEdit$(user);
        })
    );

    this.userSubscriptions.add(
      this.route.queryParams
        .pipe(filter((query) => !!query.tab))
        .subscribe((query) => (this.selectedTabIndex = query.tab))
    );
  }

  private getCanEdit$(user: Employee): Observable<boolean> {
    return combineLatest([this.isAdmin$, this.currentUser$]).pipe(
      map(([isAdmin, currentUser]) => {
        if (isAdmin) {
          return true;
        }

        return user && currentUser && user.mailNickname === currentUser.mailNickname;
      })
    );
  }

  private getUserFromApi(login) {
    return this.employeeApiService.searchUserByLogin(login);
  }

  public loadFollow(userId: string) {
    this.userSubscriptions.add(this.followApi.getUserFollow(userId).subscribe((res) => (this.userFollow = res)));
  }

  public onUpdateValue(value: { project: ProjectNewModel; date: moment.Moment; value: number }) {
    const currentProject = this.selectedUser.projectsNew.find((p) => p.project_id === value.project.project_id);
    const metadata = currentProject.metadata.find((m) => {
      return NewProjectUtils.mapMetadataToDate(m).isSame(value.date, 'month');
    });

    if (metadata?.percent === value.value) {
      return;
    }

    if (metadata) {
      metadata.percent = value.value;
    } else {
      const newMeta: ProjectStatsMetadataNewModel = {
        month: +value.date.format('M'),
        year: +value.date.format('YYYY'),
        percent: value.value,
      };
      currentProject.metadata = [...currentProject.metadata, newMeta];
    }

    this.employeeApiService.updateUserInfo(this.selectedUser.mailNickname, this.selectedUser).subscribe((user) => {
      this.selectedUser = user;
      this.contextStoreService.setSelectedUser(user);
    });
  }
}
