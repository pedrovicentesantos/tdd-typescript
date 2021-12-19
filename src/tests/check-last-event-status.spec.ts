import {set, reset} from 'mockdate';

class CheckLastEventStatus {
  constructor(private readonly repository: LastEventRepository) {}
  async execute(input: {groupId: string}): Promise<EventStatus> {
    const event = await this.repository.getLastEvent({groupId: input.groupId});
    if (event === undefined) return EventStatus.CLOSED;
    const now = new Date();
    if (event.endDate >= now) return EventStatus.ACTIVE;
    return EventStatus.IN_REVIEW;
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

enum EventStatus {
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

// new Date().getTime() + 1 => NOW + 1 (in the future)
// new Date().getTime() => NOW (same time)
// new Date().getTime() - 1 => NOW - 1 (in the past)

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
    
    expect(result).toBe(EventStatus.CLOSED);
  });

  it('should return status active if event has not ended', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime() + 1),
      reviewTimeInHours: 1,
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatus.ACTIVE);
  });

  it('should return status active if event end time is the same as now', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime()),
      reviewTimeInHours: 1,
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatus.ACTIVE);
  });

  it('should return status in_review if event is during review time', async () => {
    const {sut, lastEventRepositorySpy} = makeSut();
    lastEventRepositorySpy.output = {
      endDate: new Date(new Date().getTime() - 1),
      reviewTimeInHours: 1
    };
    
    const result = await sut.execute({groupId});
    
    expect(result).toBe(EventStatus.IN_REVIEW);
  });
});