const { isRestaurantAdmin } = require("../../middleware/role.middleware");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const RESTAURANT_ID = "rest-111";
const OTHER_RESTAURANT_ID = "rest-999";

const makeUser = (restaurants = [{ id: RESTAURANT_ID }]) => ({
  id: "user-1",
  restaurants,
});

describe("isRestaurantAdmin", () => {
  test("calls next when user is admin of the restaurant", () => {
    const req = {
      user: makeUser(),
      params: { restaurantId: RESTAURANT_ID },
    };
    const res = mockRes();
    const next = vi.fn();

    isRestaurantAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  test("returns 403 when user is admin of a different restaurant", () => {
    const req = {
      user: makeUser([{ id: OTHER_RESTAURANT_ID }]),
      params: { restaurantId: RESTAURANT_ID },
    };
    const res = mockRes();
    const next = vi.fn();

    isRestaurantAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied" });
  });

  test("returns 403 when user has no restaurants", () => {
    const req = {
      user: makeUser([]),
      params: { restaurantId: RESTAURANT_ID },
    };
    const res = mockRes();
    const next = vi.fn();

    isRestaurantAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
