import {set, reset} from 'mockdate';

class CheckLastEventStatus {
  constructor(private readonly repository: LastEventRepository) {}
  async execute(input: {groupId: string}): Promise<EventStatusType> {
    const event = await this.repository.getLastEvent({groupId: input.groupId});
    return new EventStatus(event).value;
  }
}

class EventStatus {
  value: EventStatusType;

  constructor(event?: IEvent) {
    if (event === undefined) {
      this.value = EventStatusType.CLOSED;
      return;
    };
    const now = new Date();
    if (event.endDate >= now) {
      this.value = EventStatusType.ACTIVE;
      return;
    }
    const reviewTimeInMilliseconds = event.reviewTimeInHours * 60 * 60 * 1000;
    const reviewEndDate = new Date(event.endDate.getTime() + reviewTimeInMilliseconds);
    this.value = now <= reviewEndDate
      ? EventStatusType.IN_REVIEW
      : EventStatusType.CLOSED;
  }
}

interface IEvent {
  endDate: Date;
  reviewTimeInHours: number;
}

interface LastEventRepository {
  getLastEvent(input: {groupId: string}): Promise<IEvent | undefined>;
}

class LastEventRepositorySpy implements LastEventRepository {
  groupId?: string;
  output?: IEvent;

  async getLastEvent(input: {groupId: string}): Promise<IEvent | undefined> {
    this.groupId = input.groupId;
    return this.output;
  }
}

enum EventStatusType {
  CLOSED = 'closed',
  ACTIVE = 'active',
  IN_REVIEW = 'in_review',
}

type SutOutput = {
  sut: CheckLastEventStatus;
  lastEventRepositorySpy: LastEventRepositorySpy;
}

const makeSut = (): SutOutput => {
  const lastEventRepositorySpy = new LastEventRepositorySpy();
  const sut = new CheckLastEventStatus(lastEventRepositorySpy);
  return {sut, lastEventRepositorySpy};
}

// new Date().getTime() + 1 => NOW + 1
// new Date().getTime() => NOW
// new Date().getTime() - 1 => NOW - 1
// new Date().getTime() - reviewTimeInMilliseconds => NOW
// new Date().getTime() - reviewTimeInMilliseconds + 1 => NOW + 1
// new Date().getTime() - reviewTimeInMilliseconds - 1 => NOW - 1

describe('CheckLastEventStatus use case', () => {
  const groupId = 'any-group-id';
  beforeAll(() => {
    set(new Date());
  });

  afterAll(() => {
    reset();
  });

  it('should get last event data', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();

    await sut.execute({groupId});
    
    expect(lastEventRepositorySpy.groupId).toBe('any-group-id');
  });

  it('should call getLastEvent only one time', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    lastEventRepositorySpy.getLastEvent = jest.fn();
    
    await sut.execute({groupId});
    
    expect(lastEventRepositorySpy.getLastEvent).toHaveBeenCalled();
  });

  it('should return status closed if group doesn\'t have an event', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    lastEventRepositorySpy.output = undefined;
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatusType.CLOSED);
  });

  it('should return status active if event has not ended', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime() + 1),
      reviewTimeInHours: 1,
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatusType.ACTIVE);
  });

  it('should return status active if event end time is the same as now', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime()),
      reviewTimeInHours: 1,
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatusType.ACTIVE);
  });

  it('should return status in_review if event is during review time', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime() - 1),
      reviewTimeInHours: 1
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatusType.IN_REVIEW);
  });

  it('should return status in_review if now is before end of review time', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    const reviewTimeInHours = 1;
    const reviewTimeInMilliseconds = reviewTimeInHours * 60 * 60 * 1000;
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime() - reviewTimeInMilliseconds + 1),
      reviewTimeInHours
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatusType.IN_REVIEW);
  });

  it('should return status in_review if now is equal to end of review time', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    const reviewTimeInHours = 1;
    const reviewTimeInMilliseconds = reviewTimeInHours * 60 * 60 * 1000;
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime() - reviewTimeInMilliseconds),
      reviewTimeInHours
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatusType.IN_REVIEW);
  });

  it('should return status closed if now is after end of review time', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    const reviewTimeInHours = 1;
    const reviewTimeInMilliseconds = reviewTimeInHours * 60 * 60 * 1000;
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime() - reviewTimeInMilliseconds - 1),
      reviewTimeInHours
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatusType.CLOSED);
  });
});